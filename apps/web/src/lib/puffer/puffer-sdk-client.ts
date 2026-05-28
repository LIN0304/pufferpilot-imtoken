import type { EthereumProviderLike } from '../wallet/ethereum-provider'
import type { PufferNetworkId } from './contract-addresses'
import { getPufferNetwork } from './contract-addresses'

const WEI_PER_ETH = 1_000_000_000_000_000_000n

export type PufferStakeAsset = 'ETH' | 'stETH' | 'wstETH'

interface EstimateDepositGasInput {
  provider: EthereumProviderLike
  walletAddress: `0x${string}`
  networkId: PufferNetworkId
}

interface StakeOperationInput extends EstimateDepositGasInput {
  asset: PufferStakeAsset
  amountEth: number
  allowMainnet?: boolean
}

export function ethAmountToWei(amountEth: number): bigint {
  if (!Number.isFinite(amountEth) || amountEth <= 0) {
    throw new Error('Enter a positive ETH amount before requesting a wallet transaction.')
  }

  const normalized = amountEth.toLocaleString('en-US', {
    maximumFractionDigits: 18,
    useGrouping: false,
  })
  const [whole = '0', fraction = ''] = normalized.split('.')
  const wei = BigInt(whole) * WEI_PER_ETH + BigInt(fraction.padEnd(18, '0').slice(0, 18) || '0')

  if (wei <= 0n) {
    throw new Error('ETH amount is too small to convert to wei.')
  }

  return wei
}

function assertExecutionBoundary(networkId: PufferNetworkId, allowMainnet = false) {
  const network = getPufferNetwork(networkId)

  if (!network.isTestnet && !allowMainnet) {
    throw new Error('Mainnet wallet prompts require an explicit MAINNET confirmation.')
  }
}

async function createPufferClient(provider: EthereumProviderLike, networkId: PufferNetworkId) {
  const { Chain, PufferClient, PufferClientHelpers } = await import('@pufferfinance/puffer-sdk')
  const sdkChain = networkId === 'holesky' ? Chain.Holesky : Chain.Mainnet
  const walletClient = PufferClientHelpers.createWalletClient({
    chain: sdkChain,
    provider,
  })
  const publicClient = PufferClientHelpers.createPublicClient({
    chain: sdkChain,
    provider,
  })

  return new PufferClient(sdkChain, walletClient, publicClient)
}

async function createStakeOperation({
  provider,
  walletAddress,
  networkId,
  asset,
  amountEth,
  allowMainnet,
}: StakeOperationInput) {
  assertExecutionBoundary(networkId, allowMainnet)

  const pufferClient = await createPufferClient(provider, networkId)
  if (asset === 'ETH') {
    return pufferClient.vault.depositETH(walletAddress)
  }

  const amountWei = ethAmountToWei(amountEth)
  if (asset === 'stETH') {
    return pufferClient.depositor.depositStETH(walletAddress, amountWei)
  }
  return pufferClient.depositor.depositWstETH(walletAddress, amountWei)
}

export async function estimateSdkStakeGas(input: StakeOperationInput): Promise<string> {
  const operation = await createStakeOperation(input)
  const gasEstimate = await operation.estimate()

  return gasEstimate.toString()
}

export async function executeSdkStake(input: StakeOperationInput): Promise<`0x${string}`> {
  assertExecutionBoundary(input.networkId, input.allowMainnet)
  const pufferClient = await createPufferClient(input.provider, input.networkId)

  if (input.asset === 'ETH') {
    const { transact } = pufferClient.vault.depositETH(input.walletAddress)
    return transact(ethAmountToWei(input.amountEth))
  }

  const amountWei = ethAmountToWei(input.amountEth)
  const operation =
    input.asset === 'stETH'
      ? await pufferClient.depositor.depositStETH(input.walletAddress, amountWei)
      : await pufferClient.depositor.depositWstETH(input.walletAddress, amountWei)

  return operation.transact()
}

export async function estimateSdkDepositGas({
  provider,
  walletAddress,
  networkId,
}: EstimateDepositGasInput): Promise<string> {
  return estimateSdkStakeGas({
    provider,
    walletAddress,
    networkId,
    asset: 'ETH',
    amountEth: 0.01,
  })
}

export async function readSdkPufEthBalance({
  provider,
  walletAddress,
  networkId,
}: EstimateDepositGasInput): Promise<bigint> {
  const pufferClient = await createPufferClient(provider, networkId)
  return pufferClient.vault.balanceOf(walletAddress)
}

export async function readSdkPufEthRate({
  provider,
  networkId,
}: Omit<EstimateDepositGasInput, 'walletAddress'>): Promise<bigint> {
  const pufferClient = await createPufferClient(provider, networkId)
  return pufferClient.vault.getPufETHRate()
}

export async function executeSdkDepositEth({
  provider,
  walletAddress,
  networkId,
  amountEth,
}: Omit<StakeOperationInput, 'asset'>): Promise<`0x${string}`> {
  return executeSdkStake({
    provider,
    walletAddress,
    networkId,
    amountEth,
    asset: 'ETH',
  })
}

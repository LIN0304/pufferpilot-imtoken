import type { EthereumProviderLike } from '../wallet/ethereum-provider'
import type { PufferNetworkId } from './contract-addresses'
import { getPufferNetwork } from './contract-addresses'

interface EstimateDepositGasInput {
  provider: EthereumProviderLike
  walletAddress: `0x${string}`
  networkId: PufferNetworkId
}

export async function estimateSdkDepositGas({
  provider,
  walletAddress,
  networkId,
}: EstimateDepositGasInput): Promise<string> {
  const network = getPufferNetwork(networkId)

  if (!network.isTestnet) {
    throw new Error('SDK gas estimate is enabled only for the Holesky testnet demo route.')
  }

  const { Chain, PufferClient, PufferClientHelpers } = await import('@pufferfinance/puffer-sdk')
  const walletClient = PufferClientHelpers.createWalletClient({
    chain: Chain.Holesky,
    provider,
  })
  const publicClient = PufferClientHelpers.createPublicClient({
    chain: Chain.Holesky,
    provider,
  })
  const pufferClient = new PufferClient(Chain.Holesky, walletClient, publicClient)
  const { estimate } = pufferClient.vault.depositETH(walletAddress)
  const gasEstimate = await estimate()

  return gasEstimate.toString()
}

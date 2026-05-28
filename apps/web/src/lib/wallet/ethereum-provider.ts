type EthereumRequestArgs = {
  method: string
  params?: unknown[]
}

type EthereumProviderEvent = 'accountsChanged' | 'chainChanged'

export interface EthereumProviderLike {
  isImToken?: boolean
  isMetaMask?: boolean
  on?(event: EthereumProviderEvent, listener: (payload: unknown) => void): void
  removeListener?(event: EthereumProviderEvent, listener: (payload: unknown) => void): void
  request(args: EthereumRequestArgs): Promise<unknown>
}

export interface WalletTransactionRequest {
  from: `0x${string}`
  to: `0x${string}`
  data?: `0x${string}`
  value?: `0x${string}`
  gas?: `0x${string}` | string
  gasPrice?: `0x${string}` | string
}

declare global {
  interface Window {
    ethereum?: EthereumProviderLike
    imToken?: unknown
  }
}

export function detectWalletRuntime(): {
  hasProvider: boolean
  isImToken: boolean
  isMetaMask: boolean
  mode: 'mock' | 'injected'
  chainId?: number
} {
  if (typeof window === 'undefined') {
    return {
      hasProvider: false,
      isImToken: false,
      isMetaMask: false,
      mode: 'mock',
    }
  }

  const provider = window.ethereum

  return {
    hasProvider: Boolean(provider),
    isImToken: Boolean(window.imToken || provider?.isImToken),
    isMetaMask: Boolean(provider?.isMetaMask),
    mode: provider ? 'injected' : 'mock',
  }
}

export function parseChainId(chainId: unknown): number | undefined {
  if (typeof chainId === 'string') {
    return Number.parseInt(chainId, 16)
  }
  if (typeof chainId === 'number') {
    return chainId
  }
  return undefined
}

function getProvider(provider?: EthereumProviderLike): EthereumProviderLike | undefined {
  if (provider) {
    return provider
  }
  if (typeof window === 'undefined') {
    return undefined
  }
  return window.ethereum
}

function parseAccounts(result: unknown): `0x${string}`[] {
  return Array.isArray(result)
    ? result.filter(
        (item): item is `0x${string}` => typeof item === 'string' && item.startsWith('0x'),
      )
    : []
}

function parseHexQuantity(value: unknown): bigint | undefined {
  if (typeof value !== 'string' || !value.startsWith('0x')) {
    return undefined
  }
  return BigInt(value)
}

const WEI_PER_ETH = 1_000_000_000_000_000_000n

export function weiToEthNumber(wei: bigint): number {
  return Number(wei) / Number(WEI_PER_ETH)
}

export function formatWeiToEth(wei: bigint, maxFractionDigits = 6): string {
  const sign = wei < 0n ? '-' : ''
  const absoluteWei = wei < 0n ? -wei : wei
  const whole = absoluteWei / WEI_PER_ETH
  const fractional = absoluteWei % WEI_PER_ETH
  const paddedFraction = fractional.toString().padStart(18, '0').slice(0, maxFractionDigits)
  const trimmedFraction = paddedFraction.replace(/0+$/, '')

  return `${sign}${whole.toString()}${trimmedFraction ? `.${trimmedFraction}` : ''}`
}

export async function requestPreviewOnlyAccounts(
  injectedProvider?: EthereumProviderLike,
): Promise<`0x${string}`[]> {
  const provider = getProvider(injectedProvider)
  if (!provider) {
    return []
  }

  const result = await provider.request({ method: 'eth_accounts' })
  return parseAccounts(result)
}

export async function requestWalletAccounts(
  injectedProvider?: EthereumProviderLike,
): Promise<`0x${string}`[]> {
  const provider = getProvider(injectedProvider)
  if (!provider) {
    return []
  }

  const result = await provider.request({ method: 'eth_requestAccounts' })
  return parseAccounts(result)
}

export async function readWalletChainId(
  injectedProvider?: EthereumProviderLike,
): Promise<number | undefined> {
  const provider = getProvider(injectedProvider)
  if (!provider) {
    return undefined
  }

  const result = await provider.request({ method: 'eth_chainId' })
  return parseChainId(result)
}

export async function readNativeBalance(
  walletAddress: `0x${string}`,
  injectedProvider?: EthereumProviderLike,
): Promise<bigint | undefined> {
  const provider = getProvider(injectedProvider)
  if (!provider) {
    return undefined
  }

  const result = await provider.request({
    method: 'eth_getBalance',
    params: [walletAddress, 'latest'],
  })
  return parseHexQuantity(result)
}

export async function switchOrAddEthereumChain(params: {
  chainIdHex: `0x${string}`
  chainName: string
  rpcUrls: string[]
  blockExplorerUrls: string[]
  nativeCurrency: {
    name: string
    symbol: string
    decimals: number
  }
}): Promise<void> {
  const provider = getProvider()
  if (!provider) {
    throw new Error('No injected wallet provider is available.')
  }

  try {
    await provider.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: params.chainIdHex }],
    })
  } catch (error) {
    const errorCode =
      typeof error === 'object' && error ? (error as { code?: number }).code : undefined
    if (errorCode !== 4902) {
      throw error
    }

    await provider.request({
      method: 'wallet_addEthereumChain',
      params: [
        {
          chainId: params.chainIdHex,
          chainName: params.chainName,
          rpcUrls: params.rpcUrls,
          blockExplorerUrls: params.blockExplorerUrls,
          nativeCurrency: params.nativeCurrency,
        },
      ],
    })
  }
}

export async function sendWalletTransaction(
  transaction: WalletTransactionRequest,
  injectedProvider?: EthereumProviderLike,
): Promise<`0x${string}`> {
  const provider = getProvider(injectedProvider)
  if (!provider) {
    throw new Error('No injected wallet provider is available.')
  }

  const result = await provider.request({
    method: 'eth_sendTransaction',
    params: [transaction],
  })

  if (typeof result !== 'string' || !result.startsWith('0x')) {
    throw new Error('Wallet did not return a transaction hash.')
  }

  return result as `0x${string}`
}

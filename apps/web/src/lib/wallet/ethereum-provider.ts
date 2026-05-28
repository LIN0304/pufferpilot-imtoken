type EthereumRequestArgs = {
  method: string
  params?: unknown[]
}

type EthereumProviderEvent = 'accountsChanged' | 'chainChanged'
type Eip6963AnnounceEvent = CustomEvent<Eip6963ProviderDetail>

export interface EthereumProviderLike {
  isImToken?: boolean
  isMetaMask?: boolean
  isCoinbaseWallet?: boolean
  providers?: EthereumProviderLike[]
  on?(event: EthereumProviderEvent, listener: (payload: unknown) => void): void
  removeListener?(event: EthereumProviderEvent, listener: (payload: unknown) => void): void
  request(args: EthereumRequestArgs): Promise<unknown>
}

export interface Eip6963ProviderDetail {
  info: {
    uuid: string
    name: string
    icon?: string
    rdns?: string
  }
  provider: EthereumProviderLike
}

export interface WalletProviderOption {
  id: string
  label: string
  rdns?: string
  icon?: string
  isImToken: boolean
  isMetaMask: boolean
  isCoinbaseWallet: boolean
  source: 'eip6963' | 'injected'
  provider: EthereumProviderLike
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

function providerLabel(provider: EthereumProviderLike, fallback = 'Injected wallet') {
  if (provider.isImToken) {
    return 'imToken'
  }
  if (provider.isMetaMask) {
    return 'MetaMask'
  }
  if (provider.isCoinbaseWallet) {
    return 'Coinbase Wallet'
  }
  return fallback
}

function normalizeProviderOption(
  provider: EthereumProviderLike,
  index: number,
  detail?: Eip6963ProviderDetail,
): WalletProviderOption {
  const label = detail?.info.name ?? providerLabel(provider)
  const rdns = detail?.info.rdns
  const id = `${detail ? 'eip6963' : 'injected'}:${rdns ?? detail?.info.uuid ?? label}:${index}`

  return {
    id,
    label,
    rdns,
    icon: detail?.info.icon,
    isImToken: Boolean(window.imToken || provider.isImToken || rdns?.includes('imtoken')),
    isMetaMask: Boolean(provider.isMetaMask || rdns?.includes('metamask')),
    isCoinbaseWallet: Boolean(provider.isCoinbaseWallet || rdns?.includes('coinbase')),
    source: detail ? 'eip6963' : 'injected',
    provider,
  }
}

function dedupeProviders(providers: WalletProviderOption[]) {
  const seen = new Set<EthereumProviderLike>()
  const result: WalletProviderOption[] = []

  for (const option of providers) {
    if (seen.has(option.provider)) {
      continue
    }
    seen.add(option.provider)
    result.push(option)
  }

  return result
}

export function getInjectedWalletProviders(): WalletProviderOption[] {
  if (typeof window === 'undefined') {
    return []
  }

  const ethereum = window.ethereum
  if (!ethereum) {
    return []
  }

  const providers = Array.isArray(ethereum.providers) ? ethereum.providers : [ethereum]
  return dedupeProviders(
    providers.map((provider, index) => normalizeProviderOption(provider, index)),
  )
}

export async function discoverInjectedWalletProviders(
  timeoutMs = 250,
): Promise<WalletProviderOption[]> {
  if (typeof window === 'undefined') {
    return []
  }

  const announced: WalletProviderOption[] = []

  await new Promise<void>((resolve) => {
    const timerId = window.setTimeout(() => {
      window.removeEventListener('eip6963:announceProvider', handleAnnouncement as EventListener)
      resolve()
    }, timeoutMs)

    const handleAnnouncement = (event: Event) => {
      const detail = (event as Eip6963AnnounceEvent).detail
      if (!detail?.provider) {
        return
      }
      announced.push(normalizeProviderOption(detail.provider, announced.length, detail))
    }

    window.addEventListener('eip6963:announceProvider', handleAnnouncement as EventListener)
    window.dispatchEvent(new Event('eip6963:requestProvider'))

    if (timeoutMs <= 0) {
      window.clearTimeout(timerId)
      window.removeEventListener('eip6963:announceProvider', handleAnnouncement as EventListener)
      resolve()
    }
  })

  return dedupeProviders([...announced, ...getInjectedWalletProviders()])
}

export function detectWalletRuntime(providerOverride?: EthereumProviderLike): {
  hasProvider: boolean
  isImToken: boolean
  isMetaMask: boolean
  isCoinbaseWallet: boolean
  mode: 'mock' | 'injected'
  chainId?: number
} {
  if (typeof window === 'undefined') {
    return {
      hasProvider: false,
      isImToken: false,
      isMetaMask: false,
      isCoinbaseWallet: false,
      mode: 'mock',
    }
  }

  const provider = providerOverride ?? window.ethereum

  return {
    hasProvider: Boolean(provider),
    isImToken: Boolean(window.imToken || provider?.isImToken),
    isMetaMask: Boolean(provider?.isMetaMask),
    isCoinbaseWallet: Boolean(provider?.isCoinbaseWallet),
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
  provider?: EthereumProviderLike
}): Promise<void> {
  const provider = getProvider(params.provider)
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

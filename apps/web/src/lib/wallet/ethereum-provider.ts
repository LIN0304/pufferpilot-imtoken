type EthereumRequestArgs = {
  method: string
  params?: unknown[]
}

export interface EthereumProviderLike {
  isImToken?: boolean
  request(args: EthereumRequestArgs): Promise<unknown>
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
  mode: 'mock' | 'injected'
  chainId?: number
} {
  const provider = window.ethereum

  return {
    hasProvider: Boolean(provider),
    isImToken: Boolean(window.imToken || provider?.isImToken),
    mode: provider ? 'injected' : 'mock',
  }
}

function parseChainId(chainId: unknown): number | undefined {
  if (typeof chainId === 'string') {
    return Number.parseInt(chainId, 16)
  }
  if (typeof chainId === 'number') {
    return chainId
  }
  return undefined
}

export async function requestPreviewOnlyAccounts(): Promise<string[]> {
  const provider = window.ethereum
  if (!provider) {
    return []
  }

  const result = await provider.request({ method: 'eth_accounts' })
  return Array.isArray(result)
    ? result.filter((item): item is string => typeof item === 'string')
    : []
}

export async function requestWalletAccounts(): Promise<`0x${string}`[]> {
  const provider = window.ethereum
  if (!provider) {
    return []
  }

  const result = await provider.request({ method: 'eth_requestAccounts' })
  return Array.isArray(result)
    ? result.filter(
        (item): item is `0x${string}` => typeof item === 'string' && item.startsWith('0x'),
      )
    : []
}

export async function readWalletChainId(): Promise<number | undefined> {
  const provider = window.ethereum
  if (!provider) {
    return undefined
  }

  const result = await provider.request({ method: 'eth_chainId' })
  return parseChainId(result)
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
  const provider = window.ethereum
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

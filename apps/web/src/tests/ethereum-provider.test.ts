import { afterEach, describe, expect, it, vi } from 'vitest'
import type { EthereumProviderLike } from '../lib/wallet/ethereum-provider'
import {
  detectWalletRuntime,
  formatWeiToEth,
  getInjectedWalletProviders,
  readNativeBalance,
  readWalletChainId,
  requestPreviewOnlyAccounts,
  requestWalletAccounts,
  weiToEthNumber,
} from '../lib/wallet/ethereum-provider'

describe('ethereum provider helpers', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('detects imToken injected providers', () => {
    vi.stubGlobal('window', {
      ethereum: {
        isImToken: true,
        request: vi.fn(),
      },
      imToken: {},
    })

    expect(detectWalletRuntime()).toMatchObject({
      hasProvider: true,
      isImToken: true,
      mode: 'injected',
    })
  })

  it('lists multiple injected wallet providers for selector UI', () => {
    const metaMaskProvider: EthereumProviderLike = {
      isMetaMask: true,
      request: vi.fn(),
    }
    const imTokenProvider: EthereumProviderLike = {
      isImToken: true,
      request: vi.fn(),
    }
    vi.stubGlobal('window', {
      ethereum: {
        providers: [metaMaskProvider, imTokenProvider],
        request: vi.fn(),
      },
    })

    const providers = getInjectedWalletProviders()

    expect(providers.map((provider) => provider.label)).toEqual(['MetaMask', 'imToken'])
    expect(providers[0]?.isMetaMask).toBe(true)
    expect(providers[1]?.isImToken).toBe(true)
  })

  it('reads accounts, chain id, and native balance through EIP-1193 RPCs', async () => {
    const request = vi.fn(async ({ method }: { method: string }) => {
      if (method === 'eth_accounts') {
        return ['0x1111111111111111111111111111111111111111']
      }
      if (method === 'eth_requestAccounts') {
        return ['0x2222222222222222222222222222222222222222']
      }
      if (method === 'eth_chainId') {
        return '0x4268'
      }
      if (method === 'eth_getBalance') {
        return '0x2386f26fc10000'
      }
      return undefined
    })
    const provider: EthereumProviderLike = { request }

    expect(await requestPreviewOnlyAccounts(provider)).toEqual([
      '0x1111111111111111111111111111111111111111',
    ])
    expect(await requestWalletAccounts(provider)).toEqual([
      '0x2222222222222222222222222222222222222222',
    ])
    expect(await readWalletChainId(provider)).toBe(17000)
    expect(await readNativeBalance('0x2222222222222222222222222222222222222222', provider)).toBe(
      10_000_000_000_000_000n,
    )
  })

  it('formats wei balances for wallet display', () => {
    expect(weiToEthNumber(10_000_000_000_000_000n)).toBe(0.01)
    expect(formatWeiToEth(1_234_567_890_000_000_000n, 6)).toBe('1.234567')
    expect(formatWeiToEth(1_000_000_000_000_000_000n, 6)).toBe('1')
  })
})

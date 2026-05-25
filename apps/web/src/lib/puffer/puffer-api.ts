import { PRICE_TOKEN_ADDRESSES, PUFFER_API_BASE, PUFFER_CONTRACTS } from './contract-addresses'
import { MOCK_PUFFER_SNAPSHOT } from './mock-puffer-response'
import type { PufferApiClientOptions, PufferSnapshot, TokenPrice, VaultApy } from './types'

interface RawRateResponse {
  pufEthPerEth?: string
  ethPerPufEth?: string
  totalAssets?: string
  totalSupply?: string
}

interface RawProtocolResponse {
  lrt_total_usd?: string
  avs_total_usd?: string
  avs_eigen_total_usd?: string
  unifi_total_usd?: string
  tvl_puffer_staking?: string
  apy?: string
  timestamp?: string
}

interface RawVaultApyRow {
  id?: number
  token_address?: string
  lookback_days?: number
  apy?: string
  updated_at?: string
}

interface RawVaultApyResponse {
  data?: RawVaultApyRow[]
  timestamp?: string
}

interface RawVaultTvlResponse {
  unifi_usd_vault?: string
  unifi_eth_vault?: string
  unifi_btc_vault?: string
}

interface RawTokenPrice {
  usd?: number
}

type RawTokenPriceResponse = Record<string, RawTokenPrice>

const ADDRESS_LABEL_ROWS: Array<[string, string]> = [
  [PUFFER_CONTRACTS.pufferVault.address, 'pufETH'],
  [PUFFER_CONTRACTS.weth.address, 'WETH'],
  [PUFFER_CONTRACTS.steth.address, 'stETH'],
  [PUFFER_CONTRACTS.wsteth.address, 'wstETH'],
  [PUFFER_CONTRACTS.unifiEthVault.address, 'UniFi ETH Vault'],
  [PUFFER_CONTRACTS.unifiUsdVault.address, 'UniFi USD Vault'],
  [PUFFER_CONTRACTS.unifiBtcVault.address, 'UniFi BTC Vault'],
]

const ADDRESS_LABELS = new Map(
  ADDRESS_LABEL_ROWS.map(([address, label]) => [address.toLowerCase(), label]),
)

function toNumber(value: string | number | undefined, fallback = 0): number {
  const parsed = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

async function fetchJson<T>(url: URL, fetcher: typeof fetch, timeoutMs: number): Promise<T> {
  const controller = new AbortController()
  const timeout = globalThis.setTimeout(() => controller.abort(), timeoutMs)

  try {
    const response = await fetcher(url, { signal: controller.signal })
    if (!response.ok) {
      throw new Error(`Puffer API returned ${response.status}`)
    }
    return (await response.json()) as T
  } finally {
    globalThis.clearTimeout(timeout)
  }
}

function labelForAddress(address: string | undefined): string {
  if (!address) {
    return 'Unknown vault'
  }
  return ADDRESS_LABELS.get(address.toLowerCase()) ?? 'Puffer contract'
}

function normalizeVaultApys(response: RawVaultApyResponse): VaultApy[] {
  return (response.data ?? []).map((row, index) => {
    const tokenAddress = row.token_address ?? ''

    return {
      id: row.id ?? index,
      tokenAddress,
      label: labelForAddress(tokenAddress),
      lookbackDays: row.lookback_days ?? 0,
      apy: toNumber(row.apy),
      updatedAt: row.updated_at ?? response.timestamp ?? '',
    }
  })
}

function normalizePrices(response: RawTokenPriceResponse): TokenPrice[] {
  return Object.entries(response).map(([rawAddress, value]) => ({
    address: rawAddress,
    label: labelForAddress(rawAddress),
    usd: toNumber(value?.usd),
  }))
}

export async function getPufferSnapshot(
  options: PufferApiClientOptions = {},
): Promise<PufferSnapshot> {
  const baseUrl = options.baseUrl ?? PUFFER_API_BASE
  const timeoutMs = options.timeoutMs ?? 5000
  const now = options.now ?? (() => new Date())
  const fetcher = options.fetcher ?? fetch

  try {
    const rateUrl = new URL(`${baseUrl}/pufeth/rate`)
    const vaultApyUrl = new URL(`${baseUrl}/vaults/apy`)
    const vaultTvlUrl = new URL(`${baseUrl}/vaults/tvl`)
    const protocolTvlUrl = new URL(`${baseUrl}/protocol/tvl`)
    const tokenPriceUrl = new URL(`${baseUrl}/tokens/prices`)
    tokenPriceUrl.searchParams.set('addresses', PRICE_TOKEN_ADDRESSES.join('%'))

    const [rate, vaultApys, vaultTvl, protocol, prices] = await Promise.all([
      fetchJson<RawRateResponse>(rateUrl, fetcher, timeoutMs),
      fetchJson<RawVaultApyResponse>(vaultApyUrl, fetcher, timeoutMs),
      fetchJson<RawVaultTvlResponse>(vaultTvlUrl, fetcher, timeoutMs),
      fetchJson<RawProtocolResponse>(protocolTvlUrl, fetcher, timeoutMs),
      fetchJson<RawTokenPriceResponse>(tokenPriceUrl, fetcher, timeoutMs),
    ])

    return {
      mode: 'live',
      fetchedAt: now().toISOString(),
      source: baseUrl,
      rate: {
        pufEthPerEth: toNumber(rate.pufEthPerEth),
        ethPerPufEth: toNumber(rate.ethPerPufEth),
        totalAssets: toNumber(rate.totalAssets),
        totalSupply: toNumber(rate.totalSupply),
      },
      protocol: {
        lrtTotalUsd: toNumber(protocol.lrt_total_usd),
        avsTotalUsd: toNumber(protocol.avs_total_usd),
        avsEigenTotalUsd: toNumber(protocol.avs_eigen_total_usd),
        unifiTotalUsd: toNumber(protocol.unifi_total_usd),
        tvlPufferStaking: toNumber(protocol.tvl_puffer_staking),
        stakingApy: toNumber(protocol.apy),
        timestamp: protocol.timestamp ?? now().toISOString(),
      },
      vaultApys: normalizeVaultApys(vaultApys),
      vaultTvl: {
        unifiEthVault: toNumber(vaultTvl.unifi_eth_vault),
        unifiUsdVault: toNumber(vaultTvl.unifi_usd_vault),
        unifiBtcVault: toNumber(vaultTvl.unifi_btc_vault),
      },
      tokenPrices: normalizePrices(prices),
      warnings: [],
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown Puffer API error'

    return {
      ...MOCK_PUFFER_SNAPSHOT,
      warnings: [`Live API unavailable: ${message}`, ...MOCK_PUFFER_SNAPSHOT.warnings],
    }
  }
}

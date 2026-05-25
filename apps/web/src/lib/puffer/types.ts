export type DataMode = 'live' | 'fallback'

export interface PufEthRate {
  pufEthPerEth: number
  ethPerPufEth: number
  totalAssets: number
  totalSupply: number
}

export interface ProtocolTvl {
  lrtTotalUsd: number
  avsTotalUsd: number
  avsEigenTotalUsd: number
  unifiTotalUsd: number
  tvlPufferStaking: number
  stakingApy: number
  timestamp: string
}

export interface VaultApy {
  id: number
  tokenAddress: string
  label: string
  lookbackDays: number
  apy: number
  updatedAt: string
}

export interface VaultTvl {
  unifiEthVault: number
  unifiUsdVault: number
  unifiBtcVault: number
}

export interface TokenPrice {
  address: string
  label: string
  usd: number
}

export interface PufferSnapshot {
  mode: DataMode
  fetchedAt: string
  source: string
  rate: PufEthRate
  protocol: ProtocolTvl
  vaultApys: VaultApy[]
  vaultTvl: VaultTvl
  tokenPrices: TokenPrice[]
  warnings: string[]
}

export interface PufferApiClientOptions {
  baseUrl?: string
  timeoutMs?: number
  now?: () => Date
  fetcher?: typeof fetch
}

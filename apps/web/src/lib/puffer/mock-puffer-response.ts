import type { PufferSnapshot } from './types'

export const MOCK_PUFFER_SNAPSHOT: PufferSnapshot = {
  mode: 'fallback',
  fetchedAt: '2026-05-25T16:42:07.472Z',
  source: 'Bundled demo fallback based on the Puffer imToken hackathon API shape',
  rate: {
    pufEthPerEth: 0.9296437048682379,
    ethPerPufEth: 1.0756809245986707,
    totalAssets: 27698.95890217012,
    totalSupply: 25750.16277480649,
  },
  protocol: {
    lrtTotalUsd: 58907098.90765618,
    avsTotalUsd: 4383290912.001257,
    avsEigenTotalUsd: 12280271.282009136,
    unifiTotalUsd: 1138674.7534980401,
    tvlPufferStaking: 60045773.66115422,
    stakingApy: 2.671380522100821,
    timestamp: '2026-05-25T16:42:07.472Z',
  },
  vaultApys: [
    {
      id: 2,
      tokenAddress: '0x170d847a8320f3b6a77ee15b0cae430e3ec933a0',
      label: 'UniFi BTC Vault',
      lookbackDays: 30,
      apy: 0,
      updatedAt: '2025-11-03T19:07:33.446Z',
    },
    {
      id: 5,
      tokenAddress: '0x196ead472583bc1e9af7a05f860d9857e1bd3dcc',
      label: 'UniFi ETH Vault',
      lookbackDays: 14,
      apy: 2.9611192958,
      updatedAt: '2025-11-03T19:07:33.417Z',
    },
    {
      id: 8,
      tokenAddress: '0x82c40e07277eBb92935f79cE92268F80dDc7caB4',
      label: 'UniFi USD Vault',
      lookbackDays: 7,
      apy: 12.7248117704,
      updatedAt: '2025-11-03T19:07:33.454Z',
    },
  ],
  vaultTvl: {
    unifiEthVault: 1026208.69,
    unifiUsdVault: 17844.212335,
    unifiBtcVault: 101340.79739833,
  },
  tokenPrices: [
    {
      address: '0xd9a442856c234a39a81a089c06451ebaa4306a72',
      label: 'pufETH',
      usd: 2292.01,
    },
    {
      address: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
      label: 'WETH',
      usd: 2134.01,
    },
  ],
  warnings: ['Using fallback data. Live API refresh is available from the dashboard.'],
}

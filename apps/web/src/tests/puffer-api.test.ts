import { describe, expect, it } from 'vitest'
import { getPufferSnapshot } from '../lib/puffer/puffer-api'

function jsonResponse(body: unknown, ok = true): Response {
  return new Response(JSON.stringify(body), {
    status: ok ? 200 : 500,
    headers: { 'content-type': 'application/json' },
  })
}

describe('getPufferSnapshot', () => {
  it('normalizes live API response shapes', async () => {
    const fetcher = async (url: RequestInfo | URL) => {
      const path = String(url)
      if (path.includes('/pufeth/rate')) {
        return jsonResponse({
          pufEthPerEth: '0.9',
          ethPerPufEth: '1.1',
          totalAssets: '100',
          totalSupply: '90',
        })
      }
      if (path.includes('/vaults/apy')) {
        return jsonResponse({
          data: [
            {
              id: 1,
              token_address: '0x196ead472583bc1e9af7a05f860d9857e1bd3dcc',
              lookback_days: 14,
              apy: '3.2',
              updated_at: '2026-05-25T00:00:00.000Z',
            },
          ],
          timestamp: '2026-05-25T00:00:00.000Z',
        })
      }
      if (path.includes('/vaults/tvl')) {
        return jsonResponse({
          unifi_eth_vault: '1000',
          unifi_usd_vault: '2000',
          unifi_btc_vault: '3000',
        })
      }
      if (path.includes('/protocol/tvl')) {
        return jsonResponse({
          lrt_total_usd: '1',
          avs_total_usd: '2',
          avs_eigen_total_usd: '3',
          unifi_total_usd: '4',
          tvl_puffer_staking: '5',
          apy: '2.5',
          timestamp: '2026-05-25T00:00:00.000Z',
        })
      }
      return jsonResponse({
        '0xd9a442856c234a39a81a089c06451ebaa4306a72': {
          usd: 2300,
        },
      })
    }

    const snapshot = await getPufferSnapshot({
      fetcher: fetcher as typeof fetch,
      now: () => new Date('2026-05-25T00:00:00.000Z'),
    })

    expect(snapshot.mode).toBe('live')
    expect(snapshot.rate.pufEthPerEth).toBe(0.9)
    expect(snapshot.vaultApys[0]?.label).toBe('UniFi ETH Vault')
    expect(snapshot.tokenPrices[0]?.usd).toBe(2300)
  })

  it('falls back when live API fails', async () => {
    const snapshot = await getPufferSnapshot({
      fetcher: (async () => {
        throw new Error('offline')
      }) as typeof fetch,
    })

    expect(snapshot.mode).toBe('fallback')
    expect(snapshot.warnings[0]).toContain('offline')
  })
})

import { renderToString } from 'react-dom/server'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'
import { WalletDashboard } from './wallet-dashboard'

describe('WalletDashboard', () => {
  it('renders the starter wallet screen', () => {
    const html = renderToString(
      <MemoryRouter>
        <WalletDashboard />
      </MemoryRouter>,
    )

    expect(html).toContain('Wallet UI Starter Kit')
    expect(html).toContain('Unified balance')
    expect(html).toContain('ETH')
  })
})

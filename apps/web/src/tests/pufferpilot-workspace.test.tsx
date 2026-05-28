import { renderToString } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { PufferPilotWorkspace } from '../features/pufferpilot/pufferpilot-workspace'

describe('PufferPilotWorkspace', () => {
  it('renders the safety-first workspace on the first screen', () => {
    const html = renderToString(<PufferPilotWorkspace />)

    expect(html).toContain('PufferPilot')
    expect(html).toContain('Stake / Exchange')
    expect(html).toContain('Exchange assets')
    expect(html).toContain('Safety Checklist')
    expect(html).toContain('Transaction Preview')
    expect(html).toContain('Demo Mode')
    expect(html).toContain('Real Wallet Mode')
    expect(html).toContain('Connect Wallet')
    expect(html).toContain('Open imToken')
    expect(html).toContain('Download imToken')
    expect(html).toContain('WalletConnect')
    expect(html).toContain('MetaMask')
    expect(html).toContain('Exchange')
    expect(html).toContain('Advanced route: any token to pufETH through 0x')
    expect(html).toContain('WBTC')
    expect(html).toContain('weETH')
    expect(html).toContain('Run demo ETH stake')
  })
})

import { renderToString } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { PufferPilotWorkspace } from '../features/pufferpilot/pufferpilot-workspace'

describe('PufferPilotWorkspace', () => {
  it('renders the safety-first workspace on the first screen', () => {
    const html = renderToString(<PufferPilotWorkspace />)

    expect(html).toContain('PufferPilot')
    expect(html).toContain('Intent Chat')
    expect(html).toContain('Safety Checklist')
    expect(html).toContain('Transaction Preview')
  })
})

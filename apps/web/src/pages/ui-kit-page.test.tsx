import { renderToString } from 'react-dom/server'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'
import { UiKitPage } from './ui-kit-page'

describe('UiKitPage', () => {
  it('renders shared component examples', () => {
    const html = renderToString(
      <MemoryRouter>
        <UiKitPage />
      </MemoryRouter>,
    )

    expect(html).toContain('UI Kit Gallery')
    expect(html).toContain('Action bar')
    expect(html).toContain('Guided flows')
  })
})

import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import userEvent from '@testing-library/user-event'
import { screen, waitFor } from '@testing-library/react'
import { renderWithProviders } from '../../../tests/helpers/render'

let mockPathname = '/admin'

vi.mock('next/navigation', () => ({
  usePathname: () => mockPathname,
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
}))

import { AdminShell } from '@/app/admin/admin-shell'

function setViewport(width: number) {
  Object.defineProperty(window, 'innerWidth', {
    configurable: true,
    writable: true,
    value: width,
  })

  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: query.includes('max-width') ? width < 768 : false,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  })

  window.dispatchEvent(new Event('resize'))
}

beforeAll(() => {
  if (typeof global.ResizeObserver === 'undefined') {
    class MockResizeObserver {
      observe() {}
      unobserve() {}
      disconnect() {}
    }
    // @ts-expect-error test-only shim
    global.ResizeObserver = MockResizeObserver
  }
})

describe('AdminShell', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockPathname = '/admin'
    document.cookie = 'sidebar_state=true; path=/'
  })

  it('highlights active routes and hides Users for non-super-admin roles', async () => {
    setViewport(1280)
    mockPathname = '/admin/users/42'

    const { rerender } = renderWithProviders(
      <AdminShell isSuperAdmin userRole="super_admin">
        <div>content</div>
      </AdminShell>,
    )

    const usersLink = screen.getByRole('link', { name: 'Users' })
    const dashboardLink = screen.getByRole('link', { name: 'Dashboard' })

    expect(usersLink).toHaveAttribute('data-active')
    expect(dashboardLink).not.toHaveAttribute('data-active')

    rerender(
      <AdminShell isSuperAdmin={false} userRole="writer">
        <div>content</div>
      </AdminShell>,
    )

    expect(screen.queryByRole('link', { name: 'Users' })).not.toBeInTheDocument()
  })

  it('opens the mobile sidebar drawer from the trigger', async () => {
    setViewport(375)
    mockPathname = '/admin/posts'

    renderWithProviders(
      <AdminShell isSuperAdmin userRole="super_admin">
        <div>content</div>
      </AdminShell>,
    )

    const user = userEvent.setup()
    const trigger = await screen.findByRole('button', { name: /toggle sidebar/i })

    await user.click(trigger)

    await waitFor(() => {
      expect(document.querySelector('[data-mobile="true"]')).toBeTruthy()
    })
  })

  it('collapses and expands on desktop rail toggle', async () => {
    setViewport(1280)
    mockPathname = '/admin/posts'

    renderWithProviders(
      <AdminShell isSuperAdmin userRole="super_admin">
        <div>content</div>
      </AdminShell>,
    )

    const user = userEvent.setup()
    const railButton = document.querySelector('[data-slot=\"sidebar-rail\"]') as HTMLButtonElement
    const sidebar = document.querySelector('[data-slot="sidebar"]')

    expect(railButton).toBeTruthy()
    expect(sidebar).toHaveAttribute('data-state', 'expanded')

    await user.click(railButton)
    expect(sidebar).toHaveAttribute('data-state', 'collapsed')

    await user.click(railButton)
    expect(sidebar).toHaveAttribute('data-state', 'expanded')
  })
})

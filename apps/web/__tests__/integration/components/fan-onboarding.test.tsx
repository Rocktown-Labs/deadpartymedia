import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderWithProviders, screen, waitFor } from '@/tests/helpers/render'
import { FanOnboarding } from '@/app/onboarding/fan-onboarding'
import { fanOnboardingAction } from '@/app/onboarding/actions'
import userEvent from '@testing-library/user-event'

// Mock dependencies
vi.mock('@/app/onboarding/actions', () => ({
  fanOnboardingAction: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
  }),
}))

vi.mock('@clerk/nextjs', () => ({
  useUser: () => ({
    user: {
      id: 'user_test123',
      publicMetadata: {},
    },
    isLoaded: true,
  }),
}))

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

describe('FanOnboarding', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render the fan onboarding form', () => {
    renderWithProviders(<FanOnboarding />)
    expect(screen.getByText(/complete your profile/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/name/i)).toBeInTheDocument()
  })

  it('should show validation error for empty name', async () => {
    const user = userEvent.setup()
    renderWithProviders(<FanOnboarding />)

    const nameInput = screen.getByLabelText(/name/i)
    const submitButton = screen.getByRole('button', { name: /complete/i })

    // Try to submit without filling name
    await user.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText(/name is required/i)).toBeInTheDocument()
    })
  })

  it('should submit form with valid name', async () => {
    const user = userEvent.setup()
    const mockAction = vi.mocked(fanOnboardingAction)
    mockAction.mockResolvedValue({
      ...({} as any),
      success: true,
    })

    renderWithProviders(<FanOnboarding />)

    const nameInput = screen.getByLabelText(/name/i)
    await user.type(nameInput, 'Test Fan')

    const submitButton = screen.getByRole('button', { name: /complete/i })
    await user.click(submitButton)

    await waitFor(() => {
      expect(mockAction).toHaveBeenCalled()
    })
  })

  it('should allow optional fields to be filled', async () => {
    const user = userEvent.setup()
    renderWithProviders(<FanOnboarding />)

    const nameInput = screen.getByLabelText(/name/i)
    await user.type(nameInput, 'Test Fan')

    // Optional location field
    const locationInput = screen.queryByLabelText(/location/i)
    if (locationInput) {
      await user.type(locationInput, 'Little Rock, AR')
    }

    expect(nameInput).toHaveValue('Test Fan')
  })
})

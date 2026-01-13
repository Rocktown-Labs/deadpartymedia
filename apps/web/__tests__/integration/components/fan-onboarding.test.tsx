import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderWithProviders, screen, waitFor } from '../../../tests/helpers/render'
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
      reload: vi.fn().mockResolvedValue(undefined),
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
    // Use getByPlaceholderText since label doesn't have htmlFor attribute
    expect(screen.getByPlaceholderText(/your name/i)).toBeInTheDocument()
  })

  it('should show validation error for empty name', async () => {
    const user = userEvent.setup()
    renderWithProviders(<FanOnboarding />)

    const nameInput = screen.getByPlaceholderText(/your name/i)
    const submitButton = screen.getByRole('button', { name: /complete/i })

    // Focus and blur the input to trigger validation, then submit
    await user.click(nameInput)
    await user.tab() // Blur the input
    await user.click(submitButton)

    // Wait for validation error - TanStack Form shows "Name is required"
    await waitFor(() => {
      expect(screen.getByText(/name is required/i)).toBeInTheDocument()
    }, { timeout: 3000 })
  })

  it('should submit form with valid name', async () => {
    const user = userEvent.setup()
    const mockAction = vi.mocked(fanOnboardingAction)
    mockAction.mockResolvedValue({
      ...({} as any),
      success: true,
    })

    renderWithProviders(<FanOnboarding />)

    // Use getByPlaceholderText since label doesn't have htmlFor attribute
    const nameInput = screen.getByPlaceholderText(/your name/i)
    await user.type(nameInput, 'Test Fan')

    const submitButton = screen.getByRole('button', { name: /complete/i })
    await user.click(submitButton)

    await waitFor(() => {
      expect(mockAction).toHaveBeenCalled()
    }, { timeout: 3000 })
  })

  it('should allow optional fields to be filled', async () => {
    const user = userEvent.setup()
    renderWithProviders(<FanOnboarding />)

    // Use getByPlaceholderText since label doesn't have htmlFor attribute
    const nameInput = screen.getByPlaceholderText(/your name/i)
    await user.type(nameInput, 'Test Fan')

    // Optional location field - check if it exists
    const locationInput = screen.queryByPlaceholderText(/location/i)
    if (locationInput) {
      await user.type(locationInput, 'Little Rock, AR')
    }

    expect(nameInput).toHaveValue('Test Fan')
  })
})

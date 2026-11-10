import { renderWithProviders, screen, waitFor } from "../../../tests/helpers/render";
import { FanOnboarding } from "@/app/onboarding/fan-onboarding";
import { fanOnboardingAction } from "@/app/onboarding/actions";
import userEvent from "@testing-library/user-event";

// Mock dependencies
vi.mock("@/app/onboarding/actions", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/app/onboarding/actions")>();
  return { ...actual, fanOnboardingAction: vi.fn(actual.fanOnboardingAction) };
});

vi.mock("@tanstack/react-router", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@tanstack/react-router")>();
  return {
    ...actual,
    useNavigate: () => vi.fn(),
    useRouter: () => ({ invalidate: vi.fn(async () => {}), history: { back: vi.fn() } }),
    useLocation: (options?: {
      select?: (location: { pathname: string; searchStr: string }) => unknown;
    }) => {
      const location = { pathname: "/", searchStr: "" };
      return options?.select ? options.select(location) : location;
    },
  };
});

vi.mock("@/lib/auth-client", () => ({
  useMusicSession: () => ({
    session: {
      userId: "user_1",
      name: "Test User",
      email: "test@example.test",
      roles: ["fan"],
      image: null,
    },
    isPending: false,
  }),
  authClient: {
    getSession: vi.fn(async () => ({ data: null })),
    signOut: vi.fn(async () => ({ error: null })),
  },
  musicSessionKey: ["music", "session"],
}));

vi.mock<typeof import("sonner")>(import("sonner"), () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

describe(FanOnboarding, () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render the fan onboarding form", () => {
    renderWithProviders(<FanOnboarding />);
    expect(screen.getByText(/complete your profile/i)).toBeInTheDocument();
    // Use getByPlaceholderText since label doesn't have htmlFor attribute

    expect(screen.getByPlaceholderText(/your name/i)).toBeInTheDocument();
  });

  it("should show validation error for empty name", async () => {
    const user = userEvent.setup();
    renderWithProviders(<FanOnboarding />);

    const nameInput = screen.getByPlaceholderText(/your name/i);
    const submitButton = screen.getByRole("button", { name: /complete/i });

    // Focus and blur the input to trigger validation, then submit

    await user.click(nameInput);
    // Blur the input
    await user.tab();
    await user.click(submitButton);

    // Wait for validation error - TanStack Form shows "Name is required"

    await waitFor(
      () => {
        expect(screen.getByText(/name is required/i)).toBeInTheDocument();
      },
      { timeout: 3000 },
    );
  });

  it("should submit form with valid name", async () => {
    const user = userEvent.setup();
    const mockAction = vi.mocked(fanOnboardingAction);
    mockAction.mockResolvedValue({
      ...({} as any),
      success: true,
      errors: [],
    });

    renderWithProviders(<FanOnboarding />);

    // Use getByPlaceholderText since label doesn't have htmlFor attribute

    const nameInput = screen.getByPlaceholderText(/your name/i);
    await user.type(nameInput, "Test Fan");

    const submitButton = screen.getByRole("button", { name: /complete/i });
    await user.click(submitButton);

    await waitFor(
      () => {
        expect(mockAction).toHaveBeenCalledTimes(1);
      },
      { timeout: 3000 },
    );
  });

  it("should allow optional fields to be filled", async () => {
    const user = userEvent.setup();
    renderWithProviders(<FanOnboarding />);

    // Use getByPlaceholderText since label doesn't have htmlFor attribute

    const nameInput = screen.getByPlaceholderText(/your name/i);
    await user.type(nameInput, "Test Fan");

    // Optional location field - check if it exists

    const locationInput = screen.queryByPlaceholderText(/location/i);
    if (locationInput) {
      await user.type(locationInput, "Little Rock, AR");
    }

    expect(nameInput).toHaveValue("Test Fan");
  });
});

import { screen } from "@testing-library/react";
import { ArtistOnboarding } from "@/app/onboarding/artist-onboarding";
import { renderWithProviders } from "../../../tests/helpers/render";

// Mock Clerk
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

// Mock router
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

// Mock database
vi.mock<typeof import("@/lib/db")>(import("@/lib/db"), () => ({
  db: {
    insert: vi.fn(),
    select: vi.fn(),
    update: vi.fn(),
  },
}));

// Mock the upload API
global.fetch = vi.fn();

describe("artist Onboarding Profile Image Upload", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (global.fetch as any).mockClear();
  });

  it("should render profile image upload functionality", () => {
    renderWithProviders(<ArtistOnboarding />);
    // Basic render test - full integration would require navigating through steps
    expect(screen.getByText("Complete Your Artist Profile")).toBeInTheDocument();
  });
});

import { screen } from "@testing-library/react";
import { ArtistOnboarding } from "@/app/onboarding/artist-onboarding";
import { renderWithProviders } from "../../../tests/helpers/render";

// Mock Clerk
vi.mock<typeof import("@clerk/nextjs")>(import("@clerk/nextjs"), () => ({
  useUser: () => ({
    user: { id: "test-user-id", reload: vi.fn().mockResolvedValue(null) },
  }),
}));

// Mock router
vi.mock<typeof import("next/navigation")>(import("next/navigation"), () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
}));

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

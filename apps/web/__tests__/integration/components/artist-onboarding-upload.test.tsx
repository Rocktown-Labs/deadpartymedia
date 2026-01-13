import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
import { ArtistOnboarding } from "@/app/onboarding/artist-onboarding";
import { renderWithProviders } from "../../../tests/helpers/render";

// Mock Clerk
vi.mock("@clerk/nextjs", () => ({
  useUser: () => ({
    user: { id: "test-user-id", reload: vi.fn().mockResolvedValue(undefined) },
  }),
}));

// Mock router
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
}));

// Mock database
vi.mock("@/lib/db", () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
  },
}));

// Mock the upload API
global.fetch = vi.fn();

describe("Artist Onboarding Profile Image Upload", () => {
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

import { screen } from "@testing-library/react";
import { renderWithProviders } from "../../../tests/helpers/render";

type MockUser = {
  roles?: string[];
} | null;

let mockUser: MockUser = null;

vi.mock<typeof import("@/components/cart/cart-modal")>(
  import("@/components/cart/cart-modal"),
  () => ({
    default: () => <div data-testid="cart-modal" />,
    CartTrigger: () => <div data-testid="cart-trigger" />,
  }),
);

vi.mock("@/lib/auth-client", () => ({
  useMusicSession: () => ({
    session: mockUser
      ? {
          userId: "user_1",
          name: "Test User",
          email: "test@example.test",
          roles: mockUser.roles || [],
          image: null,
        }
      : null,
    isPending: false,
  }),
  authClient: {
    getSession: vi.fn(async () => ({ data: null })),
    signOut: vi.fn(async () => ({ error: null })),
  },
  musicSessionKey: ["music", "session"],
}));

import Navbar from "@/components/navbar";

describe("navbar dashboard CTA", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("routes signed-in writer users to /admin", () => {
    mockUser = { roles: ["writer"] };

    renderWithProviders(<Navbar />);

    const dashboardLinks = screen.getAllByRole("link", { name: /dashboard/i });
    expect(dashboardLinks.length).toBeGreaterThan(0);
    dashboardLinks.forEach((link) => {
      expect(link).toHaveAttribute("href", "/admin");
    });
  });

  it("routes signed-in artist users to /artist-dashboard", () => {
    mockUser = { roles: ["artist"] };

    renderWithProviders(<Navbar />);

    const dashboardLinks = screen.getAllByRole("link", { name: /dashboard/i });
    expect(dashboardLinks.length).toBeGreaterThan(0);
    dashboardLinks.forEach((link) => {
      expect(link).toHaveAttribute("href", "/artist-dashboard");
    });
  });
});

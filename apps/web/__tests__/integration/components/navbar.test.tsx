
import { screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { renderWithProviders } from "../../../tests/helpers/render";

type MockUser = {
  publicMetadata?: {
    role?: string;
  };
} | null;

let mockUser: MockUser = null;

vi.mock<typeof import('@/components/cart/cart-modal')>(import('@/components/cart/cart-modal'), () => ({
  default: () => <div data-testid="cart-modal" />,
}));

vi.mock<typeof import('@clerk/nextjs')>(import('@clerk/nextjs'), () => ({
  SignInButton: ({ children }: { children: ReactNode }) => <>{children}</>,
  SignUpButton: ({ children }: { children: ReactNode }) => <>{children}</>,
  SignedIn: ({ children }: { children: ReactNode }) => (mockUser ? <>{children}</> : null),
  SignedOut: ({ children }: { children: ReactNode }) => (!mockUser ? <>{children}</> : null),
  UserButton: () => <div data-testid="user-button" />,
  useUser: () => ({ user: mockUser, isLoaded: true }),
}));

import Navbar from "@/components/navbar";

describe("navbar dashboard CTA", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("routes signed-in writer users to /admin", () => {
    mockUser = { publicMetadata: { role: "writer" } };

    renderWithProviders(<Navbar />);

    const dashboardLinks = screen.getAllByRole("link", { name: /dashboard/i });
    expect(dashboardLinks.length).toBeGreaterThan(0);
    dashboardLinks.forEach((link) => {
      expect(link).toHaveAttribute("href", "/admin");
    });
  });

  it("routes signed-in artist users to /artist-dashboard", () => {
    mockUser = { publicMetadata: { role: "artist" } };

    renderWithProviders(<Navbar />);

    const dashboardLinks = screen.getAllByRole("link", { name: /dashboard/i });
    expect(dashboardLinks.length).toBeGreaterThan(0);
    dashboardLinks.forEach((link) => {
      expect(link).toHaveAttribute("href", "/artist-dashboard");
    });
  });
});

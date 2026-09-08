import userEvent from "@testing-library/user-event";
import { screen, waitFor } from "@testing-library/react";
import { renderWithProviders } from "../../../tests/helpers/render";

let mockPathname = "/admin";

vi.mock<typeof import("next/navigation")>(import("next/navigation"), () => ({
  usePathname: () => mockPathname,
  useRouter: () => ({
    back: vi.fn(),
    prefetch: vi.fn(),
    push: vi.fn(),
    replace: vi.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
}));

import { AdminShell } from "@/app/admin/admin-shell";

function setViewport(width: number) {
  Object.defineProperty(window, "innerWidth", {
    configurable: true,
    value: width,
    writable: true,
  });

  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      addEventListener: vi.fn(),
      addListener: vi.fn(),
      dispatchEvent: vi.fn(),
      matches: query.includes("max-width") ? width < 768 : false,
      media: query,
      onchange: null,
      removeEventListener: vi.fn(),
      removeListener: vi.fn(),
    })),
    writable: true,
  });

  window.dispatchEvent(new Event("resize"));
}

beforeAll(() => {
  if (global.ResizeObserver === undefined) {
    class MockResizeObserver {
      observe() {}
      unobserve() {}
      disconnect() {}
    }
    global.ResizeObserver = MockResizeObserver as unknown as typeof ResizeObserver;
  }
});

describe(AdminShell, () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPathname = "/admin";
    document.cookie = "sidebar_state=true; path=/";
  });

  it("highlights active routes and hides Users for non-super-admin roles", async () => {
    setViewport(1280);
    mockPathname = "/admin/users/42";

    const { rerender } = renderWithProviders(
      <AdminShell isSuperAdmin userRole="super_admin">
        <div>content</div>
      </AdminShell>,
    );

    const usersButton = screen.getByRole("button", { name: "Users" });
    const dashboardButton = screen.getByRole("button", { name: "Dashboard" });
    const articlesButton = screen.getByRole("button", { name: "Articles" });
    const musicButton = screen.getByRole("button", { name: "Music Releases" });

    expect(usersButton).toHaveAttribute("data-active");
    expect(dashboardButton).not.toHaveAttribute("data-active");
    expect(articlesButton).toBeInTheDocument();
    expect(musicButton).toBeInTheDocument();

    rerender(
      <AdminShell isSuperAdmin={false} userRole="writer">
        <div>content</div>
      </AdminShell>,
    );

    expect(screen.queryByRole("button", { name: "Users" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Articles" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Music Releases" })).toBeInTheDocument();
  });

  it("opens the mobile sidebar drawer from the trigger", async () => {
    setViewport(375);
    mockPathname = "/admin/posts";

    renderWithProviders(
      <AdminShell isSuperAdmin userRole="super_admin">
        <div>content</div>
      </AdminShell>,
    );

    const user = userEvent.setup();
    const trigger = await screen.findByRole("button", { name: /toggle sidebar/i });

    await user.click(trigger);

    await waitFor(() => {
      expect(document.querySelector('[data-mobile="true"]')).toBeTruthy();
    });
  });

  it("collapses and expands on desktop rail toggle", async () => {
    setViewport(1280);
    mockPathname = "/admin/posts";

    renderWithProviders(
      <AdminShell isSuperAdmin userRole="super_admin">
        <div>content</div>
      </AdminShell>,
    );

    const user = userEvent.setup();
    const railButton = document.querySelector('[data-slot="sidebar-rail"]') as HTMLButtonElement;
    const sidebar = document.querySelector('[data-slot="sidebar"]');

    expect(railButton).toBeTruthy();
    expect(sidebar).toHaveAttribute("data-state", "expanded");

    await user.click(railButton);
    expect(sidebar).toHaveAttribute("data-state", "collapsed");
    expect(screen.getByAltText("Dead Party Media")).toBeInTheDocument();
    expect(screen.queryByText("Control Center")).not.toBeInTheDocument();

    await user.click(railButton);
    expect(sidebar).toHaveAttribute("data-state", "expanded");
    expect(screen.getByText("Control Center")).toBeInTheDocument();
  });
});

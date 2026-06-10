// @ts-nocheck
// @vitest-environment jsdom

import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PostEditor } from "@/components/admin/post-editor";
import { renderWithProviders } from "../../../tests/helpers/render";

// Mock artists hook to avoid network calls and ensure predictable data
vi.mock<typeof import("@/lib/api/artists")>(import("@/lib/api/artists"), () => ({
  useArtists: () => ({ data: [], isLoading: false }),
}));

// JSDOM doesn't implement ResizeObserver; mock it for Radix/Tiptap components used in this suite.
beforeAll(() => {
  if (global.ResizeObserver === undefined) {
    class MockResizeObserver {
      observe() {}
      unobserve() {}
      disconnect() {}
    }
    // @ts-expect-error - augment JSDOM globals for test environment
    global.ResizeObserver = MockResizeObserver;
  }
});

describe("postEditor Rich Text Toolbar", () => {
  const mockOnSubmit = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render the formatting toolbar and buttons", () => {
    renderWithProviders(<PostEditor onSubmit={mockOnSubmit} cancelHref="/admin/posts" />);

    // Check if toolbar buttons render by their HTML titles
    expect(screen.getByTitle("Bold (Cmd+B)")).toBeInTheDocument();
    expect(screen.getByTitle("Italic (Cmd+I)")).toBeInTheDocument();
    expect(screen.getByTitle("Strikethrough (Cmd+Shift+X)")).toBeInTheDocument();
    expect(screen.getByTitle("Inline Code (Cmd+E)")).toBeInTheDocument();
    expect(screen.getByTitle("Heading 2 (Cmd+Alt+2)")).toBeInTheDocument();
    expect(screen.getByTitle("Heading 3 (Cmd+Alt+3)")).toBeInTheDocument();
    expect(screen.getByTitle("Bullet List (Cmd+Shift+8)")).toBeInTheDocument();
    expect(screen.getByTitle("Numbered List (Cmd+Shift+9)")).toBeInTheDocument();
    expect(screen.getByTitle("Blockquote (Cmd+Shift+B)")).toBeInTheDocument();
    expect(screen.getByTitle("Add Link")).toBeInTheDocument();
    expect(screen.getByTitle("Undo (Cmd+Z)")).toBeInTheDocument();
    expect(screen.getByTitle("Redo (Cmd+Shift+Z)")).toBeInTheDocument();
  });

  it("should open link popover when Add Link button is clicked", async () => {
    const user = userEvent.setup();
    renderWithProviders(<PostEditor onSubmit={mockOnSubmit} cancelHref="/admin/posts" />);

    const linkButton = screen.getByTitle("Add Link");
    await user.click(linkButton);

    // Verify popover elements are visible
    expect(screen.getByText("Insert Link")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("https://example.com")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Apply" })).toBeInTheDocument();
  });
});

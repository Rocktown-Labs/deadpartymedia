// @ts-nocheck
// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PostEditor } from "@/components/admin/post-editor";
import { renderWithProviders } from "../../../tests/helpers/render";

// Mock artists hook to avoid network calls and ensure predictable data
vi.mock("@/lib/api/artists", () => ({
  useArtists: () => ({ data: [], isLoading: false }),
}));

// Sonner's toast implementation can rely on DOM APIs/timers that are flaky in JSDOM.
// We only care that the upload fetch is attempted, so mock toast to no-ops.
vi.mock("sonner", () => ({
  toast: {
    loading: vi.fn(() => "toast-id"),
    success: vi.fn(),
    error: vi.fn(),
    dismiss: vi.fn(),
  },
}));

// JSDOM doesn't implement ResizeObserver; mock it for Radix/Tiptap components used in this suite.
beforeAll(() => {
  if (typeof global.ResizeObserver === "undefined") {
    class MockResizeObserver {
      observe() {}
      unobserve() {}
      disconnect() {}
    }
    // @ts-expect-error - augment JSDOM globals for test environment
    global.ResizeObserver = MockResizeObserver;
  }
});

// Mock the upload API
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

describe("PostEditor Image Upload", () => {
  const mockOnSubmit = vi.fn();
  const mockOnCancel = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockClear();
  });

  it("should render cover image upload button", () => {
    renderWithProviders(<PostEditor onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);

    expect(screen.getByText("Upload Image")).toBeInTheDocument();
  });

  it("should allow switching between upload and URL input", async () => {
    const user = userEvent.setup();
    renderWithProviders(<PostEditor onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);

    const toggleButton = screen.getByText("Use URL");
    await user.click(toggleButton);

    expect(screen.getByPlaceholderText("https://example.com/image.jpg")).toBeInTheDocument();
  });

  it("should upload cover image when file is selected", async () => {
    const mockBlob = {
      url: "https://example.com/blob/image.jpg",
      pathname: "posts/covers/123-test.jpg",
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockBlob,
    });

    renderWithProviders(<PostEditor onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);

    const file = new File(["test"], "test.jpg", { type: "image/jpeg" });
    const input = screen.getByTestId("cover-image-input") as HTMLInputElement;

    // Simulate selecting a file; provide files on the event target (matches our other test)
    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/upload/image?type=cover"),
        expect.objectContaining({
          method: "POST",
        })
      );
    });
  });

  it("should show error toast for invalid file type", async () => {
    renderWithProviders(<PostEditor onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);

    const file = new File(["test"], "test.txt", { type: "text/plain" });
    const input = screen.getByTestId("cover-image-input");

    fireEvent.change(input, { target: { files: [file] } });

    // Note: Toast testing would require additional setup
    // This test verifies the upload is not attempted for invalid files
    await waitFor(() => {
      expect(mockFetch).not.toHaveBeenCalled();
    });
  });
});

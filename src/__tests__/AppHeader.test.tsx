import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { AppHeader } from "@/components/AppHeader";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
}));

describe("AppHeader Component", () => {
  it("renders text-only brand title without SNHU logo artwork", () => {
    render(<AppHeader />);
    const homeLink = screen.getByRole("link", { name: /SNHU Degree Map home/i });
    expect(homeLink).toBeInTheDocument();
    expect(homeLink).toHaveTextContent("SNHU");
    expect(homeLink).toHaveTextContent("Degree Map");
  });

  it("renders global search input field", () => {
    render(<AppHeader />);
    const searchInput = screen.getByRole("searchbox", {
      name: /Search degree programs, courses, or requirements/i,
    });
    expect(searchInput).toBeInTheDocument();
    expect(searchInput).toHaveAttribute(
      "placeholder",
      "Search programs, courses, or prerequisites (e.g. Computer Science, CS 300)...",
    );
  });

  it("renders Browse Programs button and opens modal dialog", () => {
    render(<AppHeader />);
    const browseButton = screen.getByRole("button", { name: /Browse Programs/i });
    expect(browseButton).toBeInTheDocument();

    fireEvent.click(browseButton);

    const dialogTitle = screen.getByRole("heading", { name: /Browse SNHU Degree Programs/i });
    expect(dialogTitle).toBeInTheDocument();
  });
});

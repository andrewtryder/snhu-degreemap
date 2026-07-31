import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { AppFooter } from "@/components/AppFooter";

describe("AppFooter Component", () => {
  it("renders unofficial site disclaimer", () => {
    render(<AppFooter />);
    expect(
      screen.getByText(/SNHU Degree Map is an independent project/i)
    ).toBeInTheDocument();
  });

  it("renders navigation and repository links", () => {
    render(<AppFooter />);
    const repoLink = screen.getByRole("link", {
      name: /GitHub Repository \(andrewtryder\/snhu-degreemap\)/i,
    });
    expect(repoLink).toBeInTheDocument();
    expect(repoLink).toHaveAttribute(
      "href",
      "https://github.com/andrewtryder/snhu-degreemap"
    );
  });
});

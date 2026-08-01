import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { AppFooter, formatCatalogLastUpdated } from "@/components/AppFooter";

describe("AppFooter Component", () => {
  it("renders the two-column navigation and disclaimer footer", async () => {
    render(await AppFooter({ lastUpdated: new Date("2026-07-31T12:00:00Z") }));

    expect(screen.getByRole("heading", { name: "Navigation & Resources" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Disclaimer" })).toBeInTheDocument();
    expect(screen.queryByText("Disclaimer & Status")).not.toBeInTheDocument();
    expect(screen.queryByText(/View Catalog Data Status/i)).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Browse All Associate Programs" })).toHaveAttribute(
      "href",
      "/programs?level=associate",
    );
    expect(screen.getByRole("link", { name: /Bachelor’s Programs/i })).toHaveAttribute(
      "href",
      "/programs?level=bachelor",
    );
    expect(screen.getByRole("link", { name: "Browse All Graduate Programs" })).toHaveAttribute(
      "href",
      "/programs?level=graduate",
    );
    expect(screen.getByRole("link", { name: "Browse Certificate Programs" })).toHaveAttribute(
      "href",
      "/programs?level=certificate",
    );
    expect(screen.getByRole("link", { name: "About SNHU Degree Map" })).toHaveAttribute("href", "/about");
    expect(screen.getByText("Last Updated: July 31, 2026")).toBeInTheDocument();
    expect(screen.queryByText(/Open-source educational project/i)).not.toBeInTheDocument();
  });

  it("shows an honest fallback when synchronization data is unavailable", async () => {
    render(await AppFooter({ lastUpdated: null }));
    expect(screen.getByText("Last Updated: Not available")).toBeInTheDocument();
  });

  it("formats cached timestamp strings and safely rejects invalid values", () => {
    expect(formatCatalogLastUpdated("2026-07-31T22:52:52.021Z")).toBe("Last Updated: July 31, 2026");
    expect(formatCatalogLastUpdated("not-a-date")).toBe("Last Updated: Not available");
  });
});

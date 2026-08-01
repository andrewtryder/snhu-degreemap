import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { ProgramDetailContent } from "@/app/programs/[slug]/page";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
  notFound: () => {
    throw new Error("NEXT_NOT_FOUND");
  },
}));

describe("Computer Science Program Page", () => {
  it("renders catalog, transfer, credit summaries, and graph without duplicate about content", async () => {
    const element = await ProgramDetailContent({ slug: "computer-science-bs" });
    render(element);

    expect(await screen.findByRole("heading", { name: "Computer Science", level: 1 })).toBeInTheDocument();
    expect(screen.getByText("Bachelor of Science in Computer Science")).toBeInTheDocument();

    const catalogLink = screen.getByRole("link", { name: /Official SNHU Catalog/i });
    expect(catalogLink).toHaveAttribute(
      "href",
      "https://www.snhu.edu/admission/academic-catalogs#/programs/V1S14E8tg/none",
    );
    expect(catalogLink.getAttribute("href")).not.toMatch(/\/api\//);
    expect(catalogLink.getAttribute("href")).not.toMatch(/kuali\.co/);

    expect(screen.getByRole("heading", { name: "Transfer Integration", level: 2 })).toBeInTheDocument();
    expect(
      screen.getByText(/\d+ of \d+ required courses have known transfer equivalencies \(\d+%\)\./i),
    ).toBeInTheDocument();
    expect(screen.queryByText(/Explore All Options on snhu-transfers/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Transfer Evaluation Disclaimer/i)).not.toBeInTheDocument();

    const transferLink = screen.getByRole("link", { name: "View transfer equivalencies for CS 210" });
    expect(transferLink).toHaveAttribute("href", "https://snhu-transfers.vercel.app/courses/CS210");

    expect(screen.getByText("Program Requirement Groups & Course Listing")).toBeInTheDocument();
    expect(screen.getByText("Credit totals by degree requirement category.")).toBeInTheDocument();
    expect(screen.getAllByText("42 Total Credits").length).toBeGreaterThan(0);
    expect(screen.queryByText("Complete all of the following")).not.toBeInTheDocument();
    expect(screen.queryByText("Complete catalog rule text")).not.toBeInTheDocument();
    expect(screen.queryByText(/About the Computer Science Degree Program/i)).not.toBeInTheDocument();
    expect(screen.queryByText("Potential Career Pathways")).not.toBeInTheDocument();

    // Nested course listings removed from credit-summary cards
    expect(screen.queryByText("MAT 241: Modern Statistics")).not.toBeInTheDocument();
    expect(screen.queryByText("Course listings mapped in interactive degree graph.")).not.toBeInTheDocument();

    expect(screen.getByLabelText(/Interactive prerequisite graph for Computer Science/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/Search courses in degree map/i)).not.toBeInTheDocument();
    expect(screen.queryByPlaceholderText(/Search map/i)).not.toBeInTheDocument();
    expect(screen.getByTitle("Download SVG Graph")).toBeInTheDocument();
    expect(screen.getByLabelText(/Preview and print degree map image/i)).toBeInTheDocument();
  }, 15000);

  it("triggers 404 for invalid program slug", async () => {
    await expect(async () => {
      await ProgramDetailContent({ slug: "non-existent-program" });
    }).rejects.toThrow("NEXT_NOT_FOUND");
  });
});

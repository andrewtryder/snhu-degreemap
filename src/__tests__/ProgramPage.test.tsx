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
  it("renders the graph, requirements, and transfer content without summary cards", async () => {
    const element = await ProgramDetailContent({ slug: "computer-science-bs" });
    render(element);

    expect(await screen.findByRole("heading", { name: "Computer Science", level: 1 })).toBeInTheDocument();
    expect(screen.getByText("Bachelor of Science in Computer Science")).toBeInTheDocument();
    expect(screen.getByText("Program Requirement Groups & Course Listing")).toBeInTheDocument();
    expect(screen.getByText("About the Computer Science Degree Program")).toBeInTheDocument();
    expect(screen.queryByText("Total Credits")).not.toBeInTheDocument();
    expect(screen.queryByText("Known Courses")).not.toBeInTheDocument();
    expect(screen.queryByText("Prerequisite Depth")).not.toBeInTheDocument();
    expect(screen.queryByText("Est. Duration")).not.toBeInTheDocument();
    expect(screen.queryByText(/This degree map represents an unofficial possible course sequence/i)).not.toBeInTheDocument();
  }, 15000);

  it("triggers 404 for invalid program slug", async () => {
    await expect(async () => {
      await ProgramDetailContent({ slug: "non-existent-program" });
    }).rejects.toThrow("NEXT_NOT_FOUND");
  });
});

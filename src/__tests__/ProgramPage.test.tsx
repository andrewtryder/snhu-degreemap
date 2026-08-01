import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { ProgramDetailContent, RequirementTreeItems } from "@/app/programs/[slug]/page";

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
    expect(
      screen.queryByText(/This degree map represents an unofficial possible course sequence/i),
    ).not.toBeInTheDocument();
  }, 15000);

  it("triggers 404 for invalid program slug", async () => {
    await expect(async () => {
      await ProgramDetailContent({ slug: "non-existent-program" });
    }).rejects.toThrow("NEXT_NOT_FOUND");
  });

  it("renders nested requirement groups recursively", () => {
    render(
      <RequirementTreeItems
        items={[
          {
            id: "cmat",
            type: "group",
            title: "Cornerstone Math (CMAT)",
            credits: null,
            subItems: [
              {
                id: "choice",
                type: "group",
                title: "Choose 1 of the following",
                credits: null,
                subItems: [{ id: "mat241", type: "choice", title: "MAT 241: Modern Statistics", credits: 3 }],
              },
            ],
          },
        ]}
      />,
    );

    expect(screen.getByText("Cornerstone Math (CMAT)")).toBeInTheDocument();
    expect(screen.getByText("Choose 1 of the following")).toBeInTheDocument();
    expect(screen.getByText("MAT 241: Modern Statistics")).toBeInTheDocument();
  });
});

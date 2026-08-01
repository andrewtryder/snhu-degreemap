import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { ProgramRequirementsContent } from "@/app/programs/[slug]/requirements/page";
import { ProgramDetailContent } from "@/app/programs/[slug]/page";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
  notFound: () => {
    throw new Error("NEXT_NOT_FOUND");
  },
}));

describe("Program requirements page", () => {
  it("renders crawlable requirement groups, nested items, and course inventory", async () => {
    const element = await ProgramRequirementsContent({ slug: "computer-science-bs" });
    render(element);

    expect(
      await screen.findByRole("heading", { name: "Computer Science Courses & Requirements", level: 1 }),
    ).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Requirement Groups", level: 2 })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Course Inventory", level: 2 })).toBeInTheDocument();

    expect(screen.getByText("Cornerstone Math (CMAT)")).toBeInTheDocument();
    expect(screen.getByText("Choose 1 of the following")).toBeInTheDocument();
    expect(screen.getByText("MAT 241: Modern Statistics")).toBeInTheDocument();

    expect(screen.getByRole("cell", { name: "Precalculus" })).toBeInTheDocument();
    expect(screen.getByRole("rowheader", { name: /MAT 140/ })).toBeInTheDocument();
    expect(screen.getByRole("rowheader", { name: /^IT 140/ })).toBeInTheDocument();
    expect(screen.getByRole("cell", { name: /Introduction to Scripting/i })).toBeInTheDocument();

    expect(screen.getByRole("link", { name: /Back to interactive degree map/i })).toHaveAttribute(
      "href",
      "/programs/computer-science-bs",
    );
  }, 15000);

  it("keeps nested course listings off the simplified program map page", async () => {
    const element = await ProgramDetailContent({ slug: "computer-science-bs" });
    render(element);

    expect(await screen.findByRole("heading", { name: "Computer Science", level: 1 })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /View full courses and requirements/i })).toHaveAttribute(
      "href",
      "/programs/computer-science-bs/requirements",
    );
    expect(screen.queryByText("MAT 241: Modern Statistics")).not.toBeInTheDocument();
    expect(screen.queryByText("Choose 1 of the following")).not.toBeInTheDocument();
    expect(screen.queryByText("Complete catalog rule text")).not.toBeInTheDocument();
  }, 15000);
});

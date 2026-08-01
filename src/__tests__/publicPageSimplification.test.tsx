import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import HomePage from "@/app/page";
import AboutPage from "@/app/about/page";
import { filterProgramsByLevel, ProgramLevelFilterPills } from "@/app/programs/page";
import { getRequirementInstruction } from "@/app/programs/[slug]/page";
import { fixturePrograms } from "@/data/fixturePrograms";
import { getProgramLevelCategory } from "@/lib/programLevelCategories";
import { RequirementItem } from "@/types/program";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

describe("public page simplification", () => {
  it("keeps the homepage title and removes promotional hero content and statistics", async () => {
    render(await HomePage());

    expect(screen.getByRole("heading", { name: "SNHU Degree Map", level: 1 })).toBeInTheDocument();
    expect(screen.getByText(/Explore interactive prerequisite graphs/i)).toBeInTheDocument();
    for (const removedText of [
      "Unofficial SNHU Degree & Prerequisite Visualizer",
      "Prototype Notice:",
      "View Computer Science (BS) Map",
      "Explore All Programs",
      "Available Programs",
      "Catalog Year",
      "React Flow + Dagre",
      "Dual View Mode",
    ]) {
      expect(screen.queryByText(removedText)).not.toBeInTheDocument();
    }
  });

  it("keeps concise student-facing About content without status or methodology cards", async () => {
    render(await AboutPage());

    expect(screen.getByRole("heading", { name: "Why This Site Exists" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "How It Works" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Important Disclaimer" })).toBeInTheDocument();
    expect(screen.queryByText("Data Methodology")).not.toBeInTheDocument();
    expect(screen.queryByText("System & Data Status")).not.toBeInTheDocument();
  });

  it("uses conservative, shared directory categories", () => {
    expect(getProgramLevelCategory({ credential: "Bachelor of Arts", degreeLevel: "BA" })).toBe("bachelor");
    expect(getProgramLevelCategory({ credential: "Bachelor of Science", degreeLevel: "BS" })).toBe("bachelor");
    expect(getProgramLevelCategory({ credential: "Master of Science", degreeLevel: "MS" })).toBe("graduate");
    expect(getProgramLevelCategory({ credential: "Graduate Certificate", degreeLevel: "Graduate Certificate" })).toBe(
      "certificate",
    );
    expect(getProgramLevelCategory({ credential: "Unclassified credential", degreeLevel: "Other" })).toBe("other");

    expect(
      filterProgramsByLevel(fixturePrograms, "bachelor").every(
        (program) => getProgramLevelCategory(program) === "bachelor",
      ),
    ).toBe(true);
  });

  it("renders URL-driven directory level pills", () => {
    render(<ProgramLevelFilterPills level="bachelor" />);

    expect(screen.getByRole("link", { name: "All" })).toHaveAttribute("href", "/programs");
    expect(screen.getByRole("link", { name: "Associate" })).toHaveAttribute("href", "/programs?level=associate");
    expect(screen.getByRole("link", { name: "Bachelor’s (BA & BS)" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Graduate (MA/MS)" })).toHaveAttribute("href", "/programs?level=graduate");
    expect(screen.getByRole("link", { name: "Certificate" })).toHaveAttribute("href", "/programs?level=certificate");
  });

  it("only renders all-of instructions for actionable requirements", () => {
    const course: RequirementItem = { id: "CS100", type: "single", title: "CS 100: Foundations", credits: 3 };
    const textOnly: RequirementItem = {
      id: "txt_1",
      type: "single",
      title: "Consult the catalog.",
      credits: null,
      isUnparsed: true,
    };

    expect(getRequirementInstruction({ ruleType: "all_of", items: [] })).toBeNull();
    expect(getRequirementInstruction({ ruleType: "all_of", items: [course] })).toBe("Complete all of the following");
    expect(getRequirementInstruction({ ruleType: "choose_n", minimumSelections: 2, items: [course] })).toBe(
      "Choose 2 of the following",
    );
    expect(getRequirementInstruction({ ruleType: "all_of", items: [textOnly] })).toBeNull();
    expect(getRequirementInstruction({ ruleType: "all_of", items: [{ ...course, credits: null }] })).toBe(
      "Complete all of the following",
    );
  });
});

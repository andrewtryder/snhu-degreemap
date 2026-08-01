import { describe, expect, it } from "vitest";
import {
  buildProgramMapDescription,
  buildProgramMapTitle,
  buildProgramRequirementsTitle,
} from "@/lib/programSeo";

describe("program SEO helpers", () => {
  it("appends level when the title does not already include it", () => {
    expect(buildProgramMapTitle({ title: "Computer Science", degreeLevel: "BS" })).toBe(
      "Computer Science BS Degree Map",
    );
    expect(buildProgramRequirementsTitle({ title: "Computer Science", degreeLevel: "BS" })).toBe(
      "Computer Science BS Degree Requirements",
    );
  });

  it("avoids duplicating credentials already present in the title", () => {
    expect(buildProgramMapTitle({ title: "Computer Science BS", degreeLevel: "BS" })).toBe(
      "Computer Science BS Degree Map",
    );
    expect(
      buildProgramMapTitle({ title: "Bachelor of Science in Accounting", degreeLevel: "BS" }),
    ).toBe("Bachelor of Science in Accounting Degree Map");
  });

  it("builds concise factual descriptions without duration claims", () => {
    const description = buildProgramMapDescription({
      title: "Computer Science",
      credential: "Bachelor of Science in Computer Science",
      catalogYear: "2025-2026",
      degreeLevel: "BS",
    });
    expect(description).toContain("2025-2026");
    expect(description).toContain("Unofficial");
    expect(description.toLowerCase()).not.toContain("4 years");
    expect(description.toLowerCase()).not.toContain("complete");
  });
});

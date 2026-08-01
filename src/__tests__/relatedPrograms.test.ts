import { describe, expect, it } from "vitest";
import { rankRelatedPrograms } from "@/lib/relatedPrograms";

describe("rankRelatedPrograms", () => {
  it("ranks same-level and shared-title programs ahead of unrelated ones", () => {
    const ranked = rankRelatedPrograms(
      {
        slug: "computer-science-bs",
        title: "Computer Science",
        credential: "Bachelor of Science in Computer Science",
        degreeLevel: "BS",
      },
      [
        {
          slug: "information-technology-bs",
          title: "Information Technology",
          credential: "Bachelor of Science in Information Technology",
          degreeLevel: "BS",
          sharedCourseCount: 4,
        },
        {
          slug: "computer-science-ms",
          title: "Computer Science",
          credential: "Master of Science in Computer Science",
          degreeLevel: "MS",
          sharedCourseCount: 1,
        },
        {
          slug: "english-ba",
          title: "English",
          credential: "Bachelor of Arts in English",
          degreeLevel: "BA",
          sharedCourseCount: 0,
        },
        {
          slug: "computer-science-bs",
          title: "Computer Science",
          credential: "Bachelor of Science in Computer Science",
          degreeLevel: "BS",
        },
      ],
      3,
    );

    expect(ranked.map((p) => p.slug)).not.toContain("computer-science-bs");
    expect(ranked[0]?.slug).toBe("information-technology-bs");
    expect(ranked.some((p) => p.slug === "computer-science-ms")).toBe(true);
  });
});

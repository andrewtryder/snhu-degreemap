import { describe, it, expect } from "vitest";
import {
  parseCourseDetails,
  extractCoursePrerequisitesFromText,
  generatePrerequisiteEdges,
} from "@/lib/kualiCourseParser";
import { getCourseCodeKey, normalizeCourseCode } from "@/lib/courseCode";

import sampleCourseDetails from "@/data/fixtures/course-detail.sample.json";
import { relationshipRegressionFixtures } from "@/data/fixtures/relationship-regression.sample";

describe("kualiCourseParser utility", () => {
  it("parses course detail payloads correctly", () => {
    const course = parseCourseDetails(sampleCourseDetails[0]);

    expect(course.code).toBe("IT 140");
    expect(course.title).toBe("Introduction to Scripting");
    expect(course.credits).toBe(3);
    expect(course.pid).toBe("61ed75d237ce9b227c9086b5");
  });

  it("preserves the requirement-link code when Kuali detail payloads omit it", () => {
    const course = parseCourseDetails(
      {
        pid: "public-course-pid",
        id: "internal-course-id",
        title: "Applied Statistics",
        subjectCode: { name: "MAT" },
      },
      "MAT240"
    );

    expect(course.code).toBe("MAT 240");
  });

  it("extracts prerequisite course codes from text", () => {
    const text1 = "Prerequisite: IT-140 and MAT-140 with a grade of C or better.";
    const result1 = extractCoursePrerequisitesFromText(text1);

    expect(result1.prerequisites).toContain("IT 140");
    expect(result1.prerequisites).toContain("MAT 140");

    const text2 = "Corequisite: CS 210.";
    const result2 = extractCoursePrerequisitesFromText(text2);

    expect(result2.corequisites).toContain("CS 210");
  });

  it("normalizes catalog code variants and keeps prerequisite/corequisite clauses separate", () => {
    expect(normalizeCourseCode("acc-201")).toBe("ACC 201");
    expect(normalizeCourseCode("ACC\u00a0201")).toBe("ACC 201");
    expect(normalizeCourseCode("ACC201")).toBe("ACC 201");
    expect(getCourseCodeKey("ACC-201")).toBe("ACC201");

    const parsed = extractCoursePrerequisitesFromText(
      "<p>Prerequisite: ACC-201 or ACC\u00a0202 with a grade of C or better.</p><p>Corequisite: BUS203.</p>"
    );

    expect(parsed.prerequisites).toEqual(["ACC 201", "ACC 202"]);
    expect(parsed.corequisites).toEqual(["BUS 203"]);
    expect(parsed.relationships).toContainEqual(
      expect.objectContaining({ code: "BUS 203", type: "corequisite" })
    );
  });

  it("generates prerequisite edges matching course catalog dependencies", () => {
    const parsedCourses = sampleCourseDetails.map((course) => parseCourseDetails(course));
    const edges = generatePrerequisiteEdges(parsedCourses);

    expect(Array.isArray(edges)).toBe(true);
    // IT 145 has prerequisite IT 140
    const edge = edges.find((e) => e.source === "IT 140" && e.target === "IT 145");
    expect(edge).toBeDefined();
    expect(edge?.type).toBe("prerequisite");
  });

  it("retains external prerequisite edges and the originating rule text", () => {
    const edges = generatePrerequisiteEdges([
      {
        pid: "acc202",
        code: "ACC 202",
        title: "Accounting II",
        credits: 3,
        description: "",
        prerequisites: ["ACC 201"],
        corequisites: [],
        relationships: [{ code: "ACC 201", type: "prerequisite", sourceText: "Prerequisite: ACC 201." }],
      },
    ]);

    expect(edges).toEqual([
      expect.objectContaining({
        source: "ACC 201",
        target: "ACC 202",
        type: "prerequisite",
        label: "Prerequisite: ACC 201.",
      }),
    ]);
  });

  it("extracts non-flat relationships from representative program-family fixtures", () => {
    const courses = relationshipRegressionFixtures.map((fixture) => parseCourseDetails(fixture.course));
    const edges = generatePrerequisiteEdges(courses);

    for (const fixture of relationshipRegressionFixtures) {
      const target = parseCourseDetails(fixture.course).code;
      expect(edges).toContainEqual(expect.objectContaining({ source: fixture.expectedSource, target }));
    }
    expect(edges.some((edge) => edge.type === "corequisite")).toBe(true);
  });
});

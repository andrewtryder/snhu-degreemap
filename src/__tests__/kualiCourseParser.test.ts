import { describe, it, expect } from "vitest";
import {
  parseCourseDetails,
  extractCoursePrerequisitesFromText,
  generatePrerequisiteEdges,
} from "@/lib/kualiCourseParser";

import sampleCourseDetails from "@/data/fixtures/course-detail.sample.json";

describe("kualiCourseParser utility", () => {
  it("parses course detail payloads correctly", () => {
    const course = parseCourseDetails(sampleCourseDetails[0]);

    expect(course.code).toBe("IT 140");
    expect(course.title).toBe("Introduction to Scripting");
    expect(course.credits).toBe(3);
    expect(course.pid).toBe("61ed75d237ce9b227c9086b5");
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

  it("generates prerequisite edges matching course catalog dependencies", () => {
    const parsedCourses = sampleCourseDetails.map(parseCourseDetails);
    const edges = generatePrerequisiteEdges(parsedCourses);

    expect(Array.isArray(edges)).toBe(true);
    // IT 145 has prerequisite IT 140
    const edge = edges.find((e) => e.source === "IT 140" && e.target === "IT 145");
    expect(edge).toBeDefined();
    expect(edge?.type).toBe("prerequisite");
  });
});

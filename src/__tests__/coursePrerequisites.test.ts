import { describe, expect, it } from "vitest";
import { buildCourseLookup, resolvePrerequisites } from "@/lib/coursePrerequisites";
import { CourseNodeData } from "@/types/program";

const courses: CourseNodeData[] = [
  {
    id: "IT145",
    code: "IT 145",
    title: "Intro to Software Development",
    credits: 3,
    groupCode: "core",
    groupName: "Core",
    groupCategory: "core",
  },
  {
    id: "CS210",
    code: "CS 210",
    title: "Programming Languages",
    credits: 3,
    groupCode: "major",
    groupName: "Major",
    groupCategory: "major",
    prerequisites: ["IT145"],
  },
];

describe("resolvePrerequisites", () => {
  it("resolves prerequisite ids to code and title", () => {
    const byId = buildCourseLookup(courses);
    expect(resolvePrerequisites(courses[1]!, byId)).toEqual([
      { code: "IT 145", title: "Intro to Software Development" },
    ]);
  });

  it("falls back to the raw reference when unmatched", () => {
    const byId = buildCourseLookup(courses);
    const orphan: CourseNodeData = {
      ...courses[1]!,
      prerequisites: ["UNKNOWN"],
    };
    expect(resolvePrerequisites(orphan, byId)).toEqual([{ code: "UNKNOWN", title: null }]);
  });
});

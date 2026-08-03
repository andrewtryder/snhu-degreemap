import { describe, it, expect, beforeEach } from "vitest";
import {
  getCoursesUrlForCourse,
  getTransferUrlForCourse,
  normalizeTransferCourseCode,
  courseCodeToTransferPathSegment,
} from "@/lib/transferIntegration";

describe("Cross-Project Integration (snhu-courses & snhu-transfers)", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  it("normalizes course codes consistently", () => {
    expect(normalizeTransferCourseCode("  cs  110 ")).toBe("CS 110");
    expect(courseCodeToTransferPathSegment("CS 110")).toBe("CS110");
  });

  it("generates canonical snhu-courses URL for given course code", () => {
    process.env.NEXT_PUBLIC_COURSES_URL = "https://snhu-courses.vercel.app";
    const url = getCoursesUrlForCourse("CS 110");
    expect(url).toBe("https://snhu-courses.vercel.app/course/CS110");
  });

  it("generates canonical snhu-transfers URL for a course code", () => {
    process.env.NEXT_PUBLIC_TRANSFERS_URL = "https://snhu-transfers.vercel.app";
    const url = getTransferUrlForCourse("CS 110");
    expect(url).toBe("https://snhu-transfers.vercel.app/courses/CS110");
  });

  it("avoids duplicate slashes when base URL has a trailing slash", () => {
    process.env.NEXT_PUBLIC_TRANSFERS_URL = "https://snhu-transfers.vercel.app/";
    expect(getTransferUrlForCourse("MAT 140")).toBe("https://snhu-transfers.vercel.app/courses/MAT140");
  });

  it("handles missing environment variables gracefully without crashing", () => {
    delete process.env.NEXT_PUBLIC_COURSES_URL;
    delete process.env.NEXT_PUBLIC_TRANSFERS_URL;

    const coursesUrl = getCoursesUrlForCourse("CS 110");
    const transfersUrl = getTransferUrlForCourse("CS 110");

    expect(coursesUrl).toContain("/course/CS110");
    expect(transfersUrl).toContain("/courses/CS110");
  });
});

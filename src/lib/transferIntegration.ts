/**
 * Cross-project URL helpers for snhu-courses and snhu-transfers.
 * Live transfer coverage is loaded server-side via transferCoverage.server.ts.
 */

export function normalizeTransferCourseCode(courseCode: string): string {
  return courseCode.trim().toUpperCase().replace(/\s+/g, " ");
}

export function courseCodeToTransferPathSegment(courseCode: string): string {
  return encodeURIComponent(normalizeTransferCourseCode(courseCode).replace(/\s+/g, ""));
}

function joinBaseAndPath(baseUrl: string, path: string): string {
  const base = baseUrl.replace(/\/$/, "");
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${base}${normalizedPath}`;
}

/**
 * Build a course-detail URL on snhu-courses.
 * Verified production route: /course/[id] (e.g. /course/CS110).
 */
export function getCoursesUrlForCourse(courseCode: string): string | null {
  const baseUrl = process.env.NEXT_PUBLIC_COURSES_URL || "https://snhu-courses.vercel.app";
  if (!baseUrl.trim()) return null;

  const codeSlug = courseCodeToTransferPathSegment(courseCode);
  if (!codeSlug) return null;
  return joinBaseAndPath(baseUrl, `/course/${codeSlug}`);
}

/**
 * Build a course-detail URL on snhu-transfers.
 * Verified production route: /courses/[courseNumber] (e.g. /courses/CS110).
 */
export function getTransferUrlForCourse(courseCode: string): string | null {
  const baseUrl = process.env.NEXT_PUBLIC_TRANSFERS_URL || "https://snhu-transfers.vercel.app";
  if (!baseUrl.trim()) return null;

  const normalized = normalizeTransferCourseCode(courseCode);
  if (!normalized) return null;

  const codeSlug = courseCodeToTransferPathSegment(normalized);
  if (!codeSlug) return null;
  return joinBaseAndPath(baseUrl, `/courses/${codeSlug}`);
}

import { DegreeProgram } from "@/types/program";
import { TransferCourseSnapshot, ProgramTransferInsights } from "@/types/transferIntegration";

// Synchronization-time snapshot of known transfer equivalencies from snhu-transfers
const defaultTransferSnapshot: Record<string, TransferCourseSnapshot> = {
  "CS 110": {
    courseCode: "CS 110",
    equivalencyCount: 14,
    canonicalUrl: "/courses/CS110",
    lastUpdated: "2026-07-20",
    topProviders: ["Sophia", "Study.com", "StraighterLine"],
  },
  "CS 210": {
    courseCode: "CS 210",
    equivalencyCount: 11,
    canonicalUrl: "/courses/CS210",
    lastUpdated: "2026-07-20",
    topProviders: ["Sophia", "Study.com"],
  },
  "CS 300": {
    courseCode: "CS 300",
    equivalencyCount: 6,
    canonicalUrl: "/courses/CS300",
    lastUpdated: "2026-07-20",
    topProviders: ["Study.com"],
  },
  "MAT 140": {
    courseCode: "MAT 140",
    equivalencyCount: 22,
    canonicalUrl: "/courses/MAT140",
    lastUpdated: "2026-07-20",
    topProviders: ["Sophia", "Study.com", "StraighterLine"],
  },
  "MAT 240": {
    courseCode: "MAT 240",
    equivalencyCount: 19,
    canonicalUrl: "/courses/MAT240",
    lastUpdated: "2026-07-20",
    topProviders: ["Sophia", "Study.com"],
  },
  "ENG 130": {
    courseCode: "ENG 130",
    equivalencyCount: 25,
    canonicalUrl: "/courses/ENG130",
    lastUpdated: "2026-07-20",
    topProviders: ["Sophia", "Study.com", "StraighterLine"],
  },
  "ACC 201": {
    courseCode: "ACC 201",
    equivalencyCount: 18,
    canonicalUrl: "/courses/ACC201",
    lastUpdated: "2026-07-20",
    topProviders: ["Sophia", "Study.com"],
  },
};

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

export function getTransferEquivalencyMap(): Record<string, TransferCourseSnapshot> {
  return defaultTransferSnapshot;
}

export function getTransferSnapshotForCourse(courseCode: string): TransferCourseSnapshot | null {
  const normalized = normalizeTransferCourseCode(courseCode);
  return defaultTransferSnapshot[normalized] || null;
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

  const snapshot = getTransferSnapshotForCourse(normalized);
  if (snapshot?.canonicalUrl) {
    const path = snapshot.canonicalUrl.startsWith("/")
      ? snapshot.canonicalUrl
      : `/${snapshot.canonicalUrl}`;
    // Re-encode the final segment for safety while preserving /courses/... shape
    const segments = path.split("/").filter(Boolean);
    const encoded = "/" + segments.map((s) => encodeURIComponent(decodeURIComponent(s))).join("/");
    return joinBaseAndPath(baseUrl, encoded);
  }

  const codeSlug = courseCodeToTransferPathSegment(normalized);
  if (!codeSlug) return null;
  return joinBaseAndPath(baseUrl, `/courses/${codeSlug}`);
}

export function calculateProgramTransferInsights(program: DegreeProgram): ProgramTransferInsights {
  const map = getTransferEquivalencyMap();
  const knownCourses = program.nodes.filter((n) => !n.isPlaceholder);
  const totalCourses = knownCourses.length;

  const transferableCodes = knownCourses
    .map((n) => normalizeTransferCourseCode(n.code))
    .filter((code) => Boolean(map[code]));

  const transferableCoursesCount = transferableCodes.length;
  const nonTransferableCoursesCount = Math.max(0, totalCourses - transferableCoursesCount);
  const coveragePercentage = totalCourses > 0 ? Math.round((transferableCoursesCount / totalCourses) * 100) : 0;

  return {
    totalCourses,
    transferableCoursesCount,
    nonTransferableCoursesCount,
    coveragePercentage,
    transferableCourseCodes: transferableCodes,
    lastSnapshotDate: "2026-07-20",
  };
}

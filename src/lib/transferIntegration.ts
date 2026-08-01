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

export function getTransferEquivalencyMap(): Record<string, TransferCourseSnapshot> {
  return defaultTransferSnapshot;
}

export function getTransferSnapshotForCourse(courseCode: string): TransferCourseSnapshot | null {
  const normalized = courseCode.trim().toUpperCase();
  return defaultTransferSnapshot[normalized] || null;
}

export function getCoursesUrlForCourse(courseCode: string): string | null {
  const baseUrl = process.env.NEXT_PUBLIC_COURSES_URL || "https://snhu-courses.vercel.app";
  if (!baseUrl) return null;

  const codeSlug = courseCode.trim().replace(/\s+/g, "");
  return `${baseUrl.replace(/\/$/, "")}/courses/${codeSlug}`;
}

export function getTransferUrlForCourse(courseCode: string): string | null {
  const baseUrl = process.env.NEXT_PUBLIC_TRANSFERS_URL || "https://snhu-transfers.vercel.app";
  if (!baseUrl) return null;

  const snapshot = getTransferSnapshotForCourse(courseCode);
  const path = snapshot?.canonicalUrl || `/courses/${courseCode.trim().replace(/\s+/g, "")}`;
  return `${baseUrl.replace(/\/$/, "")}${path}`;
}

export function calculateProgramTransferInsights(program: DegreeProgram): ProgramTransferInsights {
  const map = getTransferEquivalencyMap();
  const knownCourses = program.nodes.filter((n) => !n.isPlaceholder);
  const totalCourses = knownCourses.length;

  const transferableCodes = knownCourses.map((n) => n.code.trim().toUpperCase()).filter((code) => Boolean(map[code]));

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

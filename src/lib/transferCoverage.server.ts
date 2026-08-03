import "server-only";

import { DegreeProgram } from "@/types/program";

export type TransferCoverageCourse = {
  courseCode: string;
  displayCourseCode: string;
  hasTransferEquivalencies: boolean;
  equivalencyCount: number;
  providerCount: number;
  providers: string[];
  courseUrl: string;
};

export type TransferCoverageResponse = {
  schemaVersion: 1;
  dataLastUpdatedAt: string | null;
  requestedCourseCount: number;
  matchedCourseCount: number;
  courses: TransferCoverageCourse[];
};

export type TransferCoverageResult =
  | {
      status: "available";
      data: TransferCoverageResponse;
    }
  | {
      status: "unavailable";
    };

const MAX_BATCH_SIZE = 100;
const FETCH_TIMEOUT_MS = 5_000;
const DEFAULT_TRANSFERS_HOST = "snhu-transfers.vercel.app";

function chunk<T>(items: T[], size: number): T[][] {
  if (items.length === 0) return [];
  return Array.from({ length: Math.ceil(items.length / size) }, (_, index) =>
    items.slice(index * size, (index + 1) * size),
  );
}

export function collectProgramCoverageCourseCodes(program: DegreeProgram): string[] {
  return [
    ...new Set(
      program.nodes
        .filter(
          (course) => !course.isPlaceholder && !course.isExternal && course.code.trim() !== "",
        )
        .map((course) => course.code.toUpperCase().replace(/[\s-]+/g, "")),
    ),
  ];
}

export function getApprovedTransfersHostname(): string {
  const configured = process.env.NEXT_PUBLIC_TRANSFERS_URL?.trim();
  if (!configured) return DEFAULT_TRANSFERS_HOST;
  try {
    return new URL(configured).hostname.toLowerCase();
  } catch {
    return DEFAULT_TRANSFERS_HOST;
  }
}

/** Parse a coverage timestamp; returns null for null/invalid values. */
export function parseCoverageUpdatedAt(value: string | null): Date | null {
  if (value == null) return null;
  if (typeof value !== "string" || value.trim() === "") return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function isNonNegativeInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0 && Number.isFinite(value);
}

function isApprovedCourseUrl(courseUrl: unknown, approvedHost: string): boolean {
  if (typeof courseUrl !== "string" || courseUrl.trim() === "") return false;
  try {
    const parsed = new URL(courseUrl);
    return parsed.protocol === "https:" && parsed.hostname.toLowerCase() === approvedHost;
  } catch {
    return false;
  }
}

function isTransferCoverageCourse(
  value: unknown,
  approvedHost: string,
): value is TransferCoverageCourse {
  if (!value || typeof value !== "object") return false;
  const course = value as Record<string, unknown>;
  if (typeof course.courseCode !== "string" || course.courseCode.trim() === "") return false;
  if (typeof course.displayCourseCode !== "string") return false;
  if (typeof course.hasTransferEquivalencies !== "boolean") return false;
  if (!isNonNegativeInteger(course.equivalencyCount)) return false;
  if (!isNonNegativeInteger(course.providerCount)) return false;
  if (!Array.isArray(course.providers) || !course.providers.every((p) => typeof p === "string")) {
    return false;
  }
  if (course.providerCount !== course.providers.length) return false;
  if (!isApprovedCourseUrl(course.courseUrl, approvedHost)) return false;
  return true;
}

/**
 * Strict structural check without batch membership (used by unit tests for shape).
 * Prefer assertValidCoverageBatch for runtime acceptance.
 */
export function isTransferCoverageResponse(value: unknown): value is TransferCoverageResponse {
  if (!value || typeof value !== "object") return false;
  const body = value as Record<string, unknown>;
  if (body.schemaVersion !== 1) return false;
  if (body.dataLastUpdatedAt !== null) {
    if (typeof body.dataLastUpdatedAt !== "string") return false;
    if (!parseCoverageUpdatedAt(body.dataLastUpdatedAt)) return false;
  }
  if (!isNonNegativeInteger(body.requestedCourseCount)) return false;
  if (!isNonNegativeInteger(body.matchedCourseCount)) return false;
  if (!Array.isArray(body.courses)) return false;
  const approvedHost = getApprovedTransfersHostname();
  if (!body.courses.every((course) => isTransferCoverageCourse(course, approvedHost))) return false;
  return true;
}

/**
 * Validate a single API batch against the exact requested code list.
 * Throws on any contract violation — callers map that to unavailable.
 */
export function assertValidCoverageBatch(
  requestedCodes: string[],
  body: unknown,
): TransferCoverageResponse {
  if (!isTransferCoverageResponse(body)) {
    throw new Error("Transfer coverage returned an invalid contract");
  }

  if (body.requestedCourseCount !== requestedCodes.length) {
    throw new Error("Transfer coverage requestedCourseCount mismatch");
  }
  if (body.courses.length !== requestedCodes.length) {
    throw new Error("Transfer coverage courses length mismatch");
  }

  const requestedSet = new Set(requestedCodes);
  if (requestedSet.size !== requestedCodes.length) {
    throw new Error("Transfer coverage requested codes must be unique");
  }

  const seen = new Set<string>();
  for (const course of body.courses) {
    if (!requestedSet.has(course.courseCode)) {
      throw new Error(`Transfer coverage included unrequested course ${course.courseCode}`);
    }
    if (seen.has(course.courseCode)) {
      throw new Error(`Transfer coverage duplicated course ${course.courseCode}`);
    }
    seen.add(course.courseCode);
  }

  for (const code of requestedCodes) {
    if (!seen.has(code)) {
      throw new Error(`Transfer coverage omitted requested course ${code}`);
    }
  }

  const matched = body.courses.filter((course) => course.hasTransferEquivalencies).length;
  if (body.matchedCourseCount !== matched) {
    throw new Error("Transfer coverage matchedCourseCount mismatch");
  }

  return body;
}

async function fetchCoverageBatch(courseCodes: string[]): Promise<TransferCoverageResponse> {
  const endpoint = process.env.TRANSFER_COVERAGE_API_URL;
  if (!endpoint?.trim()) {
    throw new Error("TRANSFER_COVERAGE_API_URL is not configured");
  }

  const url = new URL(endpoint);
  url.searchParams.set("courses", courseCodes.join(","));

  const response = await fetch(url, {
    headers: {
      accept: "application/json",
      "user-agent": "SNHU-DegreeMap/1.0",
    },
    next: {
      revalidate: 300,
      tags: ["transfer-coverage"],
    },
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });

  if (!response.ok) {
    throw new Error(`Transfer coverage returned HTTP ${response.status}`);
  }

  let body: unknown;
  try {
    body = await response.json();
  } catch {
    throw new Error("Transfer coverage returned malformed JSON");
  }

  return assertValidCoverageBatch(courseCodes, body);
}

function mergeBatchResponses(
  requestedCodes: string[],
  batches: TransferCoverageResponse[],
): TransferCoverageResponse {
  const byCode = new Map<string, TransferCoverageCourse>();
  for (const batch of batches) {
    for (const course of batch.courses) {
      byCode.set(course.courseCode, course);
    }
  }

  const courses: TransferCoverageCourse[] = [];
  for (const code of requestedCodes) {
    const course = byCode.get(code);
    if (!course) {
      throw new Error(`Transfer coverage merge missing course ${code}`);
    }
    courses.push(course);
  }

  const matchedCourseCount = courses.filter((c) => c.hasTransferEquivalencies).length;
  const dataLastUpdatedAt =
    batches.map((b) => b.dataLastUpdatedAt).find((value) => value != null) ?? null;

  // Re-validate merged timestamp if present.
  if (dataLastUpdatedAt != null && !parseCoverageUpdatedAt(dataLastUpdatedAt)) {
    throw new Error("Transfer coverage merge has invalid dataLastUpdatedAt");
  }

  return {
    schemaVersion: 1,
    dataLastUpdatedAt,
    requestedCourseCount: requestedCodes.length,
    matchedCourseCount,
    courses,
  };
}

/**
 * Live transfer-equivalency coverage for a program.
 * Never invents zero coverage on infrastructure/contract failure.
 */
export async function getProgramTransferCoverage(
  program: DegreeProgram,
): Promise<TransferCoverageResult> {
  const courseCodes = collectProgramCoverageCourseCodes(program);

  if (courseCodes.length === 0) {
    return {
      status: "available",
      data: {
        schemaVersion: 1,
        dataLastUpdatedAt: null,
        requestedCourseCount: 0,
        matchedCourseCount: 0,
        courses: [],
      },
    };
  }

  if (!process.env.TRANSFER_COVERAGE_API_URL?.trim()) {
    return { status: "unavailable" };
  }

  try {
    const batches = chunk(courseCodes, MAX_BATCH_SIZE);
    const responses: TransferCoverageResponse[] = [];

    for (const batch of batches) {
      responses.push(await fetchCoverageBatch(batch));
    }

    return {
      status: "available",
      data: mergeBatchResponses(courseCodes, responses),
    };
  } catch {
    return { status: "unavailable" };
  }
}

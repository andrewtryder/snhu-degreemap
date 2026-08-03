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

function isTransferCoverageCourse(value: unknown): value is TransferCoverageCourse {
  if (!value || typeof value !== "object") return false;
  const course = value as Record<string, unknown>;
  if (typeof course.courseCode !== "string") return false;
  if (typeof course.displayCourseCode !== "string") return false;
  if (typeof course.hasTransferEquivalencies !== "boolean") return false;
  if (typeof course.equivalencyCount !== "number") return false;
  if (typeof course.providerCount !== "number") return false;
  if (!Array.isArray(course.providers) || !course.providers.every((p) => typeof p === "string")) {
    return false;
  }
  if (course.providerCount !== course.providers.length) return false;
  if (typeof course.courseUrl !== "string") return false;
  return true;
}

export function isTransferCoverageResponse(value: unknown): value is TransferCoverageResponse {
  if (!value || typeof value !== "object") return false;
  const body = value as Record<string, unknown>;
  if (body.schemaVersion !== 1) return false;
  if (!(body.dataLastUpdatedAt === null || typeof body.dataLastUpdatedAt === "string")) return false;
  if (typeof body.requestedCourseCount !== "number") return false;
  if (typeof body.matchedCourseCount !== "number") return false;
  if (!Array.isArray(body.courses)) return false;
  return body.courses.every(isTransferCoverageCourse);
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

  if (!isTransferCoverageResponse(body)) {
    throw new Error("Transfer coverage returned an invalid contract");
  }

  return body;
}

function mergeBatchResponses(
  requestedCodes: string[],
  batches: TransferCoverageResponse[],
): TransferCoverageResponse {
  const requested = new Set(requestedCodes);
  const byCode = new Map<string, TransferCoverageCourse>();

  for (const batch of batches) {
    for (const course of batch.courses) {
      if (!requested.has(course.courseCode)) continue;
      if (!byCode.has(course.courseCode)) {
        byCode.set(course.courseCode, course);
      }
    }
  }

  // Ensure every requested code appears (API normally returns unmatched explicitly).
  for (const code of requestedCodes) {
    if (byCode.has(code)) continue;
    byCode.set(code, {
      courseCode: code,
      displayCourseCode: code.replace(/^([A-Z]+)(\d+[A-Z]*)$/, "$1 $2"),
      hasTransferEquivalencies: false,
      equivalencyCount: 0,
      providerCount: 0,
      providers: [],
      courseUrl: "",
    });
  }

  const courses = requestedCodes.map((code) => byCode.get(code)!);
  const matchedCourseCount = courses.filter((c) => c.hasTransferEquivalencies).length;
  const dataLastUpdatedAt =
    batches.map((b) => b.dataLastUpdatedAt).find((value) => value != null) ?? null;

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

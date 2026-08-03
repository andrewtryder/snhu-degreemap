import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  assertValidCoverageBatch,
  collectProgramCoverageCourseCodes,
  getProgramTransferCoverage,
  isTransferCoverageResponse,
  parseCoverageUpdatedAt,
} from "@/lib/transferCoverage.server";
import { DegreeProgram } from "@/types/program";
import { fixturePrograms } from "@/data/fixturePrograms";

function makeCourse(overrides: Partial<TransferCourse> & { courseCode: string }) {
  return {
    courseCode: overrides.courseCode,
    displayCourseCode: overrides.displayCourseCode ?? overrides.courseCode,
    hasTransferEquivalencies: overrides.hasTransferEquivalencies ?? true,
    equivalencyCount: overrides.equivalencyCount ?? 1,
    providerCount: overrides.providerCount ?? 1,
    providers: overrides.providers ?? ["Sophia Learning"],
    courseUrl:
      overrides.courseUrl ?? `https://snhu-transfers.vercel.app/courses/${overrides.courseCode.toLowerCase()}`,
  };
}

type TransferCourse = {
  courseCode: string;
  displayCourseCode: string;
  hasTransferEquivalencies: boolean;
  equivalencyCount: number;
  providerCount: number;
  providers: string[];
  courseUrl: string;
};

function okResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function completeBody(codes: string[], overrides?: Partial<{ dataLastUpdatedAt: string | null }>) {
  const courses = codes.map((courseCode) =>
    makeCourse({
      courseCode,
      hasTransferEquivalencies: false,
      equivalencyCount: 0,
      providerCount: 0,
      providers: [],
    }),
  );
  return {
    schemaVersion: 1 as const,
    dataLastUpdatedAt: overrides?.dataLastUpdatedAt === undefined ? "2026-08-02T00:00:00.000Z" : overrides.dataLastUpdatedAt,
    requestedCourseCount: codes.length,
    matchedCourseCount: 0,
    courses,
  };
}

describe("transferCoverage.server", () => {
  const originalEnv = process.env;
  const csProgram = fixturePrograms.find((p) => p.slug === "computer-science-bs")!;

  beforeEach(() => {
    process.env = { ...originalEnv };
    process.env.TRANSFER_COVERAGE_API_URL = "https://snhu-transfers.vercel.app/api/v1/transfer-coverage";
    delete process.env.NEXT_PUBLIC_TRANSFERS_URL;
    vi.restoreAllMocks();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("collects non-placeholder, non-external course codes", () => {
    const program: DegreeProgram = {
      ...csProgram,
      nodes: [
        { ...csProgram.nodes[0]!, code: "CS 110", isPlaceholder: false, isExternal: false },
        { ...csProgram.nodes[0]!, id: "ext", code: "CS 999", isExternal: true },
        { ...csProgram.nodes[0]!, id: "ph", code: "ELEC 1", isPlaceholder: true },
      ],
    };
    expect(collectProgramCoverageCourseCodes(program)).toEqual(["CS110"]);
  });

  it("parses coverage timestamps safely", () => {
    expect(parseCoverageUpdatedAt(null)).toBeNull();
    expect(parseCoverageUpdatedAt("not-a-date")).toBeNull();
    expect(parseCoverageUpdatedAt("2026-08-02T00:00:00.000Z")?.toISOString()).toBe(
      "2026-08-02T00:00:00.000Z",
    );
  });

  it("rejects invalid shape and mismatched providerCount", () => {
    expect(
      isTransferCoverageResponse({
        schemaVersion: 2,
        dataLastUpdatedAt: null,
        requestedCourseCount: 0,
        matchedCourseCount: 0,
        courses: [],
      }),
    ).toBe(false);

    expect(
      isTransferCoverageResponse({
        schemaVersion: 1,
        dataLastUpdatedAt: null,
        requestedCourseCount: 1,
        matchedCourseCount: 1,
        courses: [makeCourse({ courseCode: "CS110", providerCount: 4, providers: ["A", "B"] })],
      }),
    ).toBe(false);
  });

  it("returns unavailable when schemaVersion is not 1", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        okResponse({
          schemaVersion: 2,
          dataLastUpdatedAt: null,
          requestedCourseCount: 1,
          matchedCourseCount: 0,
          courses: [],
        }),
      ),
    );

    await expect(getProgramTransferCoverage(csProgram)).resolves.toEqual({ status: "unavailable" });
  });

  it("returns unavailable on HTTP 503", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => okResponse({ error: "nope" }, 503)));
    await expect(getProgramTransferCoverage(csProgram)).resolves.toEqual({ status: "unavailable" });
  });

  it("returns unavailable on timeout", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new DOMException("The operation was aborted.", "TimeoutError");
      }),
    );
    await expect(getProgramTransferCoverage(csProgram)).resolves.toEqual({ status: "unavailable" });
  });

  it("returns unavailable on malformed JSON", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("not-json", { status: 200, headers: { "Content-Type": "application/json" } })),
    );
    await expect(getProgramTransferCoverage(csProgram)).resolves.toEqual({ status: "unavailable" });
  });

  it("returns unavailable when TRANSFER_COVERAGE_API_URL is missing", async () => {
    delete process.env.TRANSFER_COVERAGE_API_URL;
    await expect(getProgramTransferCoverage(csProgram)).resolves.toEqual({ status: "unavailable" });
  });

  it("returns unavailable for incomplete responses with duplicates and unrequested courses", async () => {
    const codes = collectProgramCoverageCourseCodes(csProgram);
    const first = codes[0]!;

    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        okResponse({
          schemaVersion: 1,
          dataLastUpdatedAt: null,
          requestedCourseCount: codes.length,
          matchedCourseCount: 1,
          courses: [
            makeCourse({ courseCode: first }),
            makeCourse({ courseCode: "ZZZ999" }),
            makeCourse({ courseCode: first }),
          ],
        }),
      ),
    );

    await expect(getProgramTransferCoverage(csProgram)).resolves.toEqual({ status: "unavailable" });
  });

  it("accepts a complete batch with null dataLastUpdatedAt", async () => {
    const codes = collectProgramCoverageCourseCodes(csProgram);
    vi.stubGlobal("fetch", vi.fn(async () => okResponse(completeBody(codes, { dataLastUpdatedAt: null }))));

    const result = await getProgramTransferCoverage(csProgram);
    expect(result.status).toBe("available");
    if (result.status !== "available") return;
    expect(result.data.dataLastUpdatedAt).toBeNull();
    expect(result.data.requestedCourseCount).toBe(codes.length);
    expect(result.data.courses).toHaveLength(codes.length);
  });

  it("returns unavailable when matchedCourseCount is wrong", async () => {
    const codes = collectProgramCoverageCourseCodes(csProgram);
    const body = completeBody(codes);
    body.matchedCourseCount = 99;
    vi.stubGlobal("fetch", vi.fn(async () => okResponse(body)));
    await expect(getProgramTransferCoverage(csProgram)).resolves.toEqual({ status: "unavailable" });
  });

  it("returns unavailable for negative counts", async () => {
    const codes = collectProgramCoverageCourseCodes(csProgram);
    const body = completeBody(codes);
    body.courses[0] = makeCourse({
      courseCode: codes[0]!,
      hasTransferEquivalencies: false,
      equivalencyCount: -1,
      providerCount: 0,
      providers: [],
    });
    vi.stubGlobal("fetch", vi.fn(async () => okResponse(body)));
    await expect(getProgramTransferCoverage(csProgram)).resolves.toEqual({ status: "unavailable" });
  });

  it("returns unavailable for non-HTTPS or wrong-host courseUrl", async () => {
    const codes = collectProgramCoverageCourseCodes(csProgram);
    const body = completeBody(codes);
    body.courses[0] = makeCourse({
      courseCode: codes[0]!,
      hasTransferEquivalencies: false,
      equivalencyCount: 0,
      providerCount: 0,
      providers: [],
      courseUrl: "http://evil.example/courses/cs110",
    });
    vi.stubGlobal("fetch", vi.fn(async () => okResponse(body)));
    await expect(getProgramTransferCoverage(csProgram)).resolves.toEqual({ status: "unavailable" });
  });

  it("returns unavailable for invalid dataLastUpdatedAt strings", async () => {
    const codes = collectProgramCoverageCourseCodes(csProgram);
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => okResponse(completeBody(codes, { dataLastUpdatedAt: "yesterday" }))),
    );
    await expect(getProgramTransferCoverage(csProgram)).resolves.toEqual({ status: "unavailable" });
  });

  it("assertValidCoverageBatch throws on omitted requested courses", () => {
    expect(() =>
      assertValidCoverageBatch(
        ["CS110", "CS210"],
        {
          schemaVersion: 1,
          dataLastUpdatedAt: null,
          requestedCourseCount: 2,
          matchedCourseCount: 1,
          courses: [makeCourse({ courseCode: "CS110" })],
        },
      ),
    ).toThrow(/length mismatch|omitted/i);
  });

  it("batches requests when more than 100 courses are present", async () => {
    const nodes = Array.from({ length: 105 }, (_, i) => ({
      ...csProgram.nodes[0]!,
      id: `n${i}`,
      code: `CS ${100 + i}`,
      isPlaceholder: false,
      isExternal: false,
    }));
    const program: DegreeProgram = { ...csProgram, nodes };
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = new URL(String(input));
      const courses = url.searchParams.get("courses")!.split(",");
      return okResponse(completeBody(courses));
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await getProgramTransferCoverage(program);
    expect(result.status).toBe("available");
    expect(fetchMock).toHaveBeenCalledTimes(2);
    if (result.status === "available") {
      expect(result.data.requestedCourseCount).toBe(105);
    }
  });

  it("returns unavailable when one batch fails among multiple", async () => {
    const nodes = Array.from({ length: 105 }, (_, i) => ({
      ...csProgram.nodes[0]!,
      id: `n${i}`,
      code: `CS ${100 + i}`,
      isPlaceholder: false,
      isExternal: false,
    }));
    const program: DegreeProgram = { ...csProgram, nodes };
    let call = 0;
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        call += 1;
        if (call === 1) {
          const url = new URL(String(input));
          const courses = url.searchParams.get("courses")!.split(",");
          return okResponse(completeBody(courses));
        }
        return okResponse({ error: "down" }, 503);
      }),
    );

    await expect(getProgramTransferCoverage(program)).resolves.toEqual({ status: "unavailable" });
  });
});

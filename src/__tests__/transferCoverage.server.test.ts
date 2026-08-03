import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  collectProgramCoverageCourseCodes,
  getProgramTransferCoverage,
  isTransferCoverageResponse,
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
    courseUrl: overrides.courseUrl ?? `https://snhu-transfers.vercel.app/courses/${overrides.courseCode}`,
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

describe("transferCoverage.server", () => {
  const originalEnv = process.env;
  const csProgram = fixturePrograms.find((p) => p.slug === "computer-science-bs")!;

  beforeEach(() => {
    process.env = { ...originalEnv };
    process.env.TRANSFER_COVERAGE_API_URL = "https://snhu-transfers.vercel.app/api/v1/transfer-coverage";
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

  it("validates the response contract", () => {
    expect(
      isTransferCoverageResponse({
        schemaVersion: 1,
        dataLastUpdatedAt: null,
        requestedCourseCount: 1,
        matchedCourseCount: 1,
        courses: [makeCourse({ courseCode: "CS110", providerCount: 1, providers: ["A"] })],
      }),
    ).toBe(true);

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

  it("accepts null dataLastUpdatedAt and ignores unrequested courses", async () => {
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
            makeCourse({ courseCode: first }), // duplicate
          ],
        }),
      ),
    );

    const result = await getProgramTransferCoverage(csProgram);
    expect(result.status).toBe("available");
    if (result.status !== "available") return;
    expect(result.data.dataLastUpdatedAt).toBeNull();
    expect(result.data.courses.every((c) => codes.includes(c.courseCode))).toBe(true);
    expect(result.data.courses.filter((c) => c.courseCode === first)).toHaveLength(1);
    expect(result.data.requestedCourseCount).toBe(codes.length);
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
      return okResponse({
        schemaVersion: 1,
        dataLastUpdatedAt: "2026-08-02T00:00:00.000Z",
        requestedCourseCount: courses.length,
        matchedCourseCount: 0,
        courses: courses.map((courseCode) =>
          makeCourse({ courseCode, hasTransferEquivalencies: false, equivalencyCount: 0, providerCount: 0, providers: [] }),
        ),
      });
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
      vi.fn(async () => {
        call += 1;
        if (call === 1) {
          return okResponse({
            schemaVersion: 1,
            dataLastUpdatedAt: null,
            requestedCourseCount: 100,
            matchedCourseCount: 0,
            courses: [],
          });
        }
        return okResponse({ error: "down" }, 503);
      }),
    );

    await expect(getProgramTransferCoverage(program)).resolves.toEqual({ status: "unavailable" });
  });
});

import { describe, it, expect, vi } from "vitest";
import { PoolClient } from "pg";
import { validateStaging } from "@/lib/program-sync/promote";
import { SyncResult } from "@/lib/program-sync/types";

describe("Program Sync Architecture & Promotion Safeguards", () => {
  it("validates staging successfully when counts match and no errors exist", async () => {
    const mockClient = {
      query: vi.fn().mockImplementation((queryText: string) => {
        if (queryText.includes("FROM programs_stage;")) return Promise.resolve({ rows: [{ count: "10" }] });
        if (queryText.includes("FROM programs;")) return Promise.resolve({ rows: [{ count: "10" }] });
        if (queryText.includes("HAVING COUNT(*) > 1;")) return Promise.resolve({ rows: [] });
        if (queryText.includes("FROM degree_courses_stage;")) return Promise.resolve({ rows: [{ count: "50" }] });
        if (queryText.includes("FROM degree_course_edges_stage;")) return Promise.resolve({ rows: [{ count: "40" }] });
        return Promise.resolve({ rows: [] });
      }),
    } as unknown as PoolClient;

    const result = await validateStaging(mockClient, 10, 0);

    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
    expect(result.programCount).toBe(10);
  });

  it("fails staging validation when program detail fetch failures occur", async () => {
    const mockClient = {
      query: vi.fn().mockImplementation((queryText: string) => {
        if (queryText.includes("FROM programs_stage;")) return Promise.resolve({ rows: [{ count: "10" }] });
        if (queryText.includes("FROM programs;")) return Promise.resolve({ rows: [{ count: "10" }] });
        if (queryText.includes("HAVING COUNT(*) > 1;")) return Promise.resolve({ rows: [] });
        if (queryText.includes("FROM degree_courses_stage;")) return Promise.resolve({ rows: [{ count: "50" }] });
        if (queryText.includes("FROM degree_course_edges_stage;")) return Promise.resolve({ rows: [{ count: "40" }] });
        return Promise.resolve({ rows: [] });
      }),
    } as unknown as PoolClient;

    const result = await validateStaging(mockClient, 10, 2); // 2 failed fetches

    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain("2 program detail fetches failed");
  });

  it("fails staging validation on material shrink without --allow-large-shrink", async () => {
    const mockClient = {
      query: vi.fn().mockImplementation((queryText: string) => {
        if (queryText.includes("FROM programs_stage;")) return Promise.resolve({ rows: [{ count: "50" }] });
        if (queryText.includes("FROM programs;")) return Promise.resolve({ rows: [{ count: "100" }] }); // 50% shrink
        if (queryText.includes("HAVING COUNT(*) > 1;")) return Promise.resolve({ rows: [] });
        if (queryText.includes("FROM degree_courses_stage;")) return Promise.resolve({ rows: [{ count: "50" }] });
        if (queryText.includes("FROM degree_course_edges_stage;")) return Promise.resolve({ rows: [{ count: "40" }] });
        return Promise.resolve({ rows: [] });
      }),
    } as unknown as PoolClient;

    const result = await validateStaging(mockClient, 50, 0, false);

    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain("Material shrink detected");
  });

  it("allows material shrink when allowLargeShrink parameter is true", async () => {
    const mockClient = {
      query: vi.fn().mockImplementation((queryText: string) => {
        if (queryText.includes("FROM programs_stage;")) return Promise.resolve({ rows: [{ count: "50" }] });
        if (queryText.includes("FROM programs;")) return Promise.resolve({ rows: [{ count: "100" }] });
        if (queryText.includes("HAVING COUNT(*) > 1;")) return Promise.resolve({ rows: [] });
        if (queryText.includes("FROM degree_courses_stage;")) return Promise.resolve({ rows: [{ count: "50" }] });
        if (queryText.includes("FROM degree_course_edges_stage;")) return Promise.resolve({ rows: [{ count: "40" }] });
        return Promise.resolve({ rows: [] });
      }),
    } as unknown as PoolClient;

    const result = await validateStaging(mockClient, 50, 0, true);

    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("fails staging validation when duplicate program slugs exist", async () => {
    const mockClient = {
      query: vi.fn().mockImplementation((queryText: string) => {
        if (queryText.includes("FROM programs_stage;")) return Promise.resolve({ rows: [{ count: "10" }] });
        if (queryText.includes("FROM programs;")) return Promise.resolve({ rows: [{ count: "10" }] });
        if (queryText.includes("HAVING COUNT(*) > 1;"))
          return Promise.resolve({ rows: [{ slug: "computer-science-bs", count: "2" }] });
        if (queryText.includes("FROM degree_courses_stage;")) return Promise.resolve({ rows: [{ count: "50" }] });
        if (queryText.includes("FROM degree_course_edges_stage;")) return Promise.resolve({ rows: [{ count: "40" }] });
        return Promise.resolve({ rows: [] });
      }),
    } as unknown as PoolClient;

    const result = await validateStaging(mockClient, 10, 0);

    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain("Duplicate program slugs found in staging");
  });

  it("blocks promotion when stored edge count falls more than 20% below live", async () => {
    const mockClient = {
      query: vi.fn().mockImplementation((queryText: string) => {
        if (queryText.includes("FILTER") && queryText.includes("degree_courses_stage")) return Promise.resolve({ rows: [{ total: "100", resolved: "95" }] });
        if (queryText.includes("FILTER") && queryText.includes("degree_courses")) return Promise.resolve({ rows: [{ total: "100", resolved: "95" }] });
        if (queryText.includes("FROM degree_course_edges_stage;")) return Promise.resolve({ rows: [{ count: "79" }] });
        if (queryText.includes("FROM degree_course_edges;")) return Promise.resolve({ rows: [{ count: "100" }] });
        if (queryText.includes("FROM programs_stage;")) return Promise.resolve({ rows: [{ count: "10" }] });
        if (queryText.includes("FROM programs;")) return Promise.resolve({ rows: [{ count: "10" }] });
        if (queryText.includes("HAVING COUNT(*) > 1;")) return Promise.resolve({ rows: [] });
        if (queryText.includes("FROM degree_courses_stage;")) return Promise.resolve({ rows: [{ count: "100" }] });
        return Promise.resolve({ rows: [] });
      }),
    } as unknown as PoolClient;

    const result = await validateStaging(mockClient, 10, 0);
    expect(result.valid).toBe(false);
    expect(result.errors.join(" ")).toContain("edge count declined more than 20%");
  });

  it("blocks promotion when resolved-course rate falls more than 20% below live", async () => {
    const mockClient = {
      query: vi.fn().mockImplementation((queryText: string) => {
        if (queryText.includes("FILTER") && queryText.includes("degree_courses_stage")) return Promise.resolve({ rows: [{ total: "100", resolved: "70" }] });
        if (queryText.includes("FILTER") && queryText.includes("degree_courses")) return Promise.resolve({ rows: [{ total: "100", resolved: "100" }] });
        if (queryText.includes("FROM degree_course_edges_stage;")) return Promise.resolve({ rows: [{ count: "100" }] });
        if (queryText.includes("FROM degree_course_edges;")) return Promise.resolve({ rows: [{ count: "100" }] });
        if (queryText.includes("FROM programs_stage;")) return Promise.resolve({ rows: [{ count: "10" }] });
        if (queryText.includes("FROM programs;")) return Promise.resolve({ rows: [{ count: "10" }] });
        if (queryText.includes("HAVING COUNT(*) > 1;")) return Promise.resolve({ rows: [] });
        if (queryText.includes("FROM degree_courses_stage;")) return Promise.resolve({ rows: [{ count: "100" }] });
        return Promise.resolve({ rows: [] });
      }),
    } as unknown as PoolClient;

    const result = await validateStaging(mockClient, 10, 0);
    expect(result.valid).toBe(false);
    expect(result.errors.join(" ")).toContain("resolved-course rate declined more than 20%");
  });

  it("formats CLI result object into single-line JSON format", () => {
    const syncResult: SyncResult = {
      action: "promoted",
      syncId: "12345",
      status: "idle",
      cursor: 10,
      expectedCount: 10,
      importedCount: 10,
      skippedCount: 0,
      failedCount: 0,
      promoted: true,
      message: "Successfully synchronized",
    };

    const jsonOutput = JSON.stringify(syncResult);
    expect(jsonOutput).not.toContain("\n");
    expect(JSON.parse(jsonOutput)).toEqual(syncResult);
  });
});

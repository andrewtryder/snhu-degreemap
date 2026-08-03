import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import {
  POPULAR_BACHELOR_PROGRAM_SLUGS,
  resolvePopularBachelorPrograms,
} from "@/lib/popularBachelorPrograms";
import { fixturePrograms } from "@/data/fixturePrograms";
import { getProgramLevelCategory } from "@/lib/programLevelCategories";

describe("popular bachelor programs", () => {
  it("resolves curated bachelor programs in configured order from available data", () => {
    const warn = vi.fn();
    const resolved = resolvePopularBachelorPrograms(fixturePrograms, { warn });

    expect(resolved.length).toBeGreaterThan(0);
    expect(resolved.length).toBeLessThanOrEqual(4);
    expect(resolved.every((program) => getProgramLevelCategory(program) === "bachelor")).toBe(true);
    expect(resolved.map((program) => program.slug)).toEqual([
      "business-administration-bs",
      "computer-science-bs",
      "psychology-ba",
    ]);

    const configuredOrder = POPULAR_BACHELOR_PROGRAM_SLUGS.filter((slug) =>
      resolved.some((program) => program.slug === slug),
    );
    expect(resolved.map((program) => program.slug)).toEqual(configuredOrder);
    expect(warn.mock.calls.some(([message]) => String(message).includes("criminal-justice-bs"))).toBe(
      true,
    );
  });

  it("skips missing slugs without substituting unrelated programs", () => {
    const warn = vi.fn();
    const onlyCs = fixturePrograms.filter((program) => program.slug === "computer-science-bs");
    const resolved = resolvePopularBachelorPrograms(onlyCs, { warn });

    expect(resolved).toHaveLength(1);
    expect(resolved[0]?.slug).toBe("computer-science-bs");
    expect(warn.mock.calls.some(([message]) => String(message).includes("criminal-justice-bs"))).toBe(
      true,
    );
  });

  it("filters out non-bachelor matches for a configured slug", () => {
    const warn = vi.fn();
    const resolved = resolvePopularBachelorPrograms(
      [
        {
          slug: "computer-science-bs",
          title: "Computer Science (MS)",
          credential: "Master of Science",
          degreeLevel: "MS",
          catalogYear: "2025-2026",
          totalCredits: 36,
          description: "Graduate lookalike",
        },
      ],
      { warn },
    );

    expect(resolved).toHaveLength(0);
    expect(warn.mock.calls.some(([message]) => String(message).includes("not bachelor-level"))).toBe(true);
  });

  it("keeps the homepage off programs.slice(0, 15)", () => {
    const pageSource = readFileSync(join(process.cwd(), "src/app/page.tsx"), "utf8");
    expect(pageSource).not.toContain("programs.slice(0, 15)");
    expect(pageSource).toContain("resolvePopularBachelorPrograms");
    expect(pageSource).toContain("Popular Bachelor’s Programs");
  });
});

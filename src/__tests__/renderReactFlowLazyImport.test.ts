import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("graph image export lazy loading", () => {
  it("does not eagerly import html-to-image at module top level", () => {
    const source = readFileSync(join(process.cwd(), "src/lib/renderReactFlowToPng.ts"), "utf8");
    expect(source).not.toMatch(/^import\s+\{\s*toPng\s*\}\s+from\s+["']html-to-image["']/m);
    expect(source).toContain('await import("html-to-image")');
  });

  it("loads the degree map through a dynamic client wrapper", () => {
    const pageSource = readFileSync(join(process.cwd(), "src/app/programs/[slug]/page.tsx"), "utf8");
    const wrapperSource = readFileSync(
      join(process.cwd(), "src/components/graph/DynamicDegreeMapGraph.tsx"),
      "utf8",
    );

    expect(pageSource).toContain("DynamicDegreeMapGraph");
    expect(pageSource).not.toMatch(/import\s+\{\s*DegreeMapGraph\s*\}\s+from/);
    expect(wrapperSource).toContain("next/dynamic");
    expect(wrapperSource).toContain('ssr: false');
  });
});

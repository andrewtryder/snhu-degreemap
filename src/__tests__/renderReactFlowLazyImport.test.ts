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

  it("defers PNG/SVG export modules until the user requests them", () => {
    const graphSource = readFileSync(
      join(process.cwd(), "src/components/graph/DegreeMapGraph.tsx"),
      "utf8",
    );

    expect(graphSource).not.toMatch(/^import\s+\{\s*downloadGraphSvg\s*\}\s+from/m);
    expect(graphSource).not.toMatch(/^import\s+\{\s*renderReactFlowToPng\s*\}\s+from/m);
    expect(graphSource).toContain('await import("@/lib/exportGraph")');
    expect(graphSource).toContain('await import("@/lib/renderReactFlowToPng")');
  });

  it("only renders viewport-visible React Flow elements", () => {
    const graphSource = readFileSync(
      join(process.cwd(), "src/components/graph/DegreeMapGraph.tsx"),
      "utf8",
    );
    expect(graphSource).toContain("onlyRenderVisibleElements={!renderAllForExport}");
  });

  it("reserves graph shell dimensions while the canvas loads", () => {
    const fallbackSource = readFileSync(
      join(process.cwd(), "src/components/graph/DegreeMapGraphLoadingFallback.tsx"),
      "utf8",
    );
    const shellSource = readFileSync(
      join(process.cwd(), "src/components/graph/graphShell.ts"),
      "utf8",
    );
    const wrapperSource = readFileSync(
      join(process.cwd(), "src/components/graph/DynamicDegreeMapGraph.tsx"),
      "utf8",
    );
    const graphSource = readFileSync(
      join(process.cwd(), "src/components/graph/DegreeMapGraph.tsx"),
      "utf8",
    );

    expect(shellSource).toContain("DEGREE_MAP_CANVAS_HEIGHT_PX = 650");
    expect(fallbackSource).toContain("DEGREE_MAP_CANVAS_HEIGHT_CLASS");
    expect(fallbackSource).not.toContain("w-[320px]");
    expect(fallbackSource).not.toContain("Show degree requirements");
    expect(wrapperSource).toContain("DegreeMapGraphLoadingFallback");
    expect(graphSource).not.toContain("RequirementsSidePanel");
    expect(graphSource).not.toContain("requirementsHref");
    expect(graphSource).not.toContain("selectedRequirementId");
    expect(graphSource).toContain("Dependencies");
    expect(graphSource).toContain("By Requirement");
  });
});

describe("program page progressive enhancement", () => {
  it("streams transfer coverage behind Suspense with reserved height", () => {
    const pageSource = readFileSync(join(process.cwd(), "src/app/programs/[slug]/page.tsx"), "utf8");
    expect(pageSource).toContain("<Suspense");
    expect(pageSource).toContain("ProgramTransferCoverage");
    expect(pageSource).toContain("min-h-[5.5rem]");
    expect(pageSource).toContain("Loading transfer coverage");
  });

  it("keeps an SSR heading for the interactive map section", () => {
    const pageSource = readFileSync(join(process.cwd(), "src/app/programs/[slug]/page.tsx"), "utf8");
    expect(pageSource).toContain("Interactive Prerequisite Map");
    expect(pageSource).toContain('id="degree-map-heading"');
  });
});

describe("font payload minimization", () => {
  it("uses swap display and avoids preloading the secondary headline font", () => {
    const layoutSource = readFileSync(join(process.cwd(), "src/app/layout.tsx"), "utf8");
    expect(layoutSource).toContain('display: "swap"');
    expect(layoutSource).toMatch(/Geist\(\{[\s\S]*preload:\s*false/);
    expect(layoutSource).toMatch(/Inter\(\{[\s\S]*preload:\s*true/);
  });
});

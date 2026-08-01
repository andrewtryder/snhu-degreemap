import { describe, it, expect } from "vitest";
import { generateGraphSvgString } from "@/lib/exportGraph";
import { fixturePrograms } from "@/data/fixturePrograms";

describe("exportGraph Utility", () => {
  const csProgram = fixturePrograms.find((p) => p.slug === "computer-science-bs")!;

  it("generates a valid SVG string containing title, catalog year, and disclaimer", () => {
    const svg = generateGraphSvgString({
      programTitle: csProgram.title,
      catalogYear: csProgram.catalogYear,
      sourceName: csProgram.sourceName,
      nodes: csProgram.nodes,
      edges: csProgram.edges,
    });

    expect(svg).toContain("<svg");
    expect(svg).toContain("</svg>");
    expect(svg).toContain("SNHU Degree Map: Computer Science");
    expect(svg).toContain("2025-2026");
    expect(svg).toContain("Unofficial Tool. SNHU Degree Map is not affiliated with");
    expect(svg).not.toContain("SNHU logo");
  });

  it("does not include edge source text in exported graph output", () => {
    const svg = generateGraphSvgString({
      programTitle: csProgram.title,
      catalogYear: csProgram.catalogYear,
      sourceName: csProgram.sourceName,
      nodes: csProgram.nodes,
      edges: [{ ...csProgram.edges[0], label: "Complete: CS 210" }],
    });

    expect(svg).not.toContain("Complete: CS 210");
  });
});

import { describe, it, expect } from "vitest";
import { layoutDegreeGraph, CATEGORY_PALETTES } from "@/lib/graphLayout";
import { fixturePrograms } from "@/data/fixturePrograms";

describe("graphLayout utility", () => {
  const csProgram = fixturePrograms.find((p) => p.slug === "computer-science-bs")!;

  it("calculates layout position coordinates for all nodes using Dagre", () => {
    const { nodes, edges } = layoutDegreeGraph(csProgram.nodes, csProgram.edges);

    expect(nodes.length).toBe(csProgram.nodes.length);
    expect(edges.length).toBe(csProgram.edges.length);

    nodes.forEach((node) => {
      expect(node.position.x).toBeTypeOf("number");
      expect(node.position.y).toBeTypeOf("number");
      expect(node.type).toBe("courseNode");
    });
  });

  it("assigns appropriate category palettes to nodes", () => {
    const { nodes } = layoutDegreeGraph(csProgram.nodes, csProgram.edges);
    const genEdNode = nodes.find((n) => n.id === "MAT140");

    expect(genEdNode).toBeDefined();
    expect(genEdNode?.data.palette).toEqual(CATEGORY_PALETTES.gened);
  });

  it("preserves relationship edges without rendering source text as an edge label", () => {
    const edgeWithContext = { ...csProgram.edges[0], label: "Complete: MAT 140" };
    const { edges } = layoutDegreeGraph(csProgram.nodes, [edgeWithContext]);

    expect(edges).toHaveLength(1);
    expect(edges[0].source).toBe(edgeWithContext.source);
    expect(edges[0].target).toBe(edgeWithContext.target);
    expect(edges[0].label).toBeUndefined();
  });

  it("renders requirement membership with a dotted, arrowless, accessible edge", () => {
    const { edges } = layoutDegreeGraph(csProgram.nodes, [
      { id: "membership", source: "IT140", target: "MAT140", type: "requirement_membership" },
    ]);
    expect(edges[0].style?.strokeDasharray).toBe("2,4");
    expect(edges[0].markerEnd).toBeUndefined();
    expect(edges[0].ariaLabel).toBe("option within requirement");
  });
});

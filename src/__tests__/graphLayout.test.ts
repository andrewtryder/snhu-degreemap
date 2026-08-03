import { describe, it, expect } from "vitest";
import {
  layoutDegreeGraph,
  CATEGORY_PALETTES,
  buildConnectedComponents,
  packLayoutBlocks,
  measureNodeBounds,
  boundsOverlap,
  getVisibleGraphBounds,
  filterGraphByGroup,
  collectRequirementCourseIds,
  COURSE_NODE_WIDTH,
  COURSE_NODE_HEIGHT,
} from "@/lib/graphLayout";
import { buildDegreeGraph } from "@/lib/graphTransformer";
import { generateGraphSvgString } from "@/lib/exportGraph";
import { fixturePrograms } from "@/data/fixturePrograms";
import {
  largeSparseGraphEdges,
  largeSparseGraphNodes,
  largeSparseRequirementGroups,
} from "@/data/fixtures/largeSparseGraph";
import type { Node } from "@xyflow/react";

describe("graphLayout utility", () => {
  const csProgram = fixturePrograms.find((p) => p.slug === "computer-science-bs")!;

  it("calculates layout position coordinates for all course nodes", () => {
    const { nodes, edges } = layoutDegreeGraph(csProgram.nodes, csProgram.edges);

    expect(nodes.filter((n) => n.type === "courseNode").length).toBe(csProgram.nodes.length);
    expect(edges.length).toBe(csProgram.edges.length);

    nodes.forEach((node) => {
      expect(node.position.x).toBeTypeOf("number");
      expect(node.position.y).toBeTypeOf("number");
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

  it("hides membership edges by default and styles them when selected", () => {
    const membership = {
      id: "membership",
      source: "IT140",
      target: "MAT140",
      type: "requirement_membership" as const,
    };
    const { edges: hidden } = layoutDegreeGraph(csProgram.nodes, [...csProgram.edges, membership]);
    expect(hidden.some((edge) => edge.id === "membership")).toBe(false);

    const { edges: shown } = layoutDegreeGraph(csProgram.nodes, csProgram.edges, {
      selectedRequirementId: "major-core",
      requirementGroups: [
        {
          id: "major-core",
          title: "Major",
          category: "major",
          colorTheme: CATEGORY_PALETTES.major as never,
          totalCredits: 3,
          ruleMetadata: { explicitCourseCodes: ["MAT 140"] },
          items: [],
        },
      ],
    });
    const membershipEdge = shown.find((edge) => edge.id.startsWith("membership_"));
    expect(membershipEdge?.style?.strokeDasharray).toBe("2,4");
    expect(membershipEdge?.markerEnd).toBeUndefined();
    expect(membershipEdge?.ariaLabel).toBe("option within requirement");
  });
});

describe("large sparse graph layout", () => {
  it("keeps Political Science-sized graphs narrower than a single-rank naive width", () => {
    const { nodes } = layoutDegreeGraph(largeSparseGraphNodes, largeSparseGraphEdges, {
      mode: "dependencies",
      targetWidth: 1800,
      gridColumns: 5,
    });
    const bounds = measureNodeBounds(nodes);
    const naiveWidth = largeSparseGraphNodes.length * (COURSE_NODE_WIDTH + 50);
    expect(bounds.width).toBeLessThan(naiveWidth * 0.55);
    expect(bounds.width).toBeLessThan(2400);
  });

  it("detects multiple connected components from prereq and coreq edges", () => {
    const components = buildConnectedComponents(
      largeSparseGraphNodes.map((n) => n.id),
      largeSparseGraphEdges,
    );
    const multi = components.filter((c) => c.length >= 2);
    expect(multi.length).toBeGreaterThanOrEqual(4);
    expect(multi.some((c) => c.includes("POL101") && c.includes("POL301"))).toBe(true);
    expect(multi.some((c) => c.includes("POL250") && c.includes("POL251"))).toBe(true);
  });

  it("places isolated courses under category section headers", () => {
    const { nodes } = layoutDegreeGraph(largeSparseGraphNodes, largeSparseGraphEdges, {
      mode: "dependencies",
      gridColumns: 4,
      targetWidth: 1800,
    });
    const headers = nodes.filter((n) => n.type === "sectionHeaderNode");
    expect(headers.some((h) => String(h.data.title).includes("General Education"))).toBe(true);
    expect(headers.some((h) => String(h.data.title).includes("Major"))).toBe(true);
    expect(String(headers[0]?.data.sourceText || "")).toMatch(/no currently known course prerequisite/i);
  });

  it("packs component blocks without overlapping bounds", () => {
    const components = buildConnectedComponents(
      largeSparseGraphNodes.map((n) => n.id),
      largeSparseGraphEdges,
    );
    const multi = components.filter((c) => c.length >= 2);
    const blocks = multi.map((ids, index) => {
      const nodes: Node[] = ids.map((id, i) => ({
        id,
        position: { x: i * 200, y: 0 },
        data: {},
        style: { width: COURSE_NODE_WIDTH, height: COURSE_NODE_HEIGHT },
      }));
      const bounds = measureNodeBounds(nodes);
      return {
        id: `b${index}`,
        nodes,
        width: bounds.width,
        height: bounds.height,
      };
    });
    const packed = packLayoutBlocks(blocks, { targetWidth: 1600, gapX: 48, gapY: 64 });
    const blockBounds = blocks.map((block) => {
      const ids = new Set(block.nodes.map((n) => n.id));
      return measureNodeBounds(packed.filter((n) => ids.has(n.id)));
    });
    for (let i = 0; i < blockBounds.length; i++) {
      for (let j = i + 1; j < blockBounds.length; j++) {
        expect(boundsOverlap(blockBounds[i], blockBounds[j])).toBe(false);
      }
    }
  });

  it("centers short packed rows within the target width", () => {
    const blocks = [
      {
        id: "a",
        width: 200,
        height: 100,
        nodes: [{ id: "a1", position: { x: 0, y: 0 }, data: {}, style: { width: 200, height: 100 } }],
      },
    ];
    const packed = packLayoutBlocks(blocks, { targetWidth: 1600 });
    expect(packed[0].position.x).toBeCloseTo((1600 - 200) / 2, 5);
  });

  it("removes nonmatching nodes and edges when filtering by group", () => {
    const all = layoutDegreeGraph(largeSparseGraphNodes, largeSparseGraphEdges, {
      groupFilter: "all",
      targetWidth: 1800,
    });
    const major = layoutDegreeGraph(largeSparseGraphNodes, largeSparseGraphEdges, {
      groupFilter: "major",
      targetWidth: 1800,
    });
    const majorCourseIds = new Set(
      major.nodes.filter((n) => n.type === "courseNode").map((n) => n.id),
    );
    expect([...majorCourseIds].every((id) => {
      const node = largeSparseGraphNodes.find((n) => n.id === id);
      return node?.groupCategory === "major";
    })).toBe(true);
    expect(major.nodes.filter((n) => n.type === "courseNode").length).toBeLessThan(
      all.nodes.filter((n) => n.type === "courseNode").length,
    );
    expect(major.edges.every((e) => majorCourseIds.has(e.source) && majorCourseIds.has(e.target))).toBe(
      true,
    );
    const filtered = filterGraphByGroup(largeSparseGraphNodes, largeSparseGraphEdges, "gened");
    expect(filtered.nodes.every((n) => n.groupCategory === "gened")).toBe(true);
  });

  it("highlights requirement courses and shows membership only when selected", () => {
    const unselected = layoutDegreeGraph(largeSparseGraphNodes, largeSparseGraphEdges, {
      requirementGroups: largeSparseRequirementGroups,
    });
    expect(unselected.edges.every((e) => !String(e.id).startsWith("membership_"))).toBe(true);

    const selected = layoutDegreeGraph(largeSparseGraphNodes, largeSparseGraphEdges, {
      requirementGroups: largeSparseRequirementGroups,
      selectedRequirementId: "major-core",
    });
    expect(selected.edges.some((e) => String(e.id).startsWith("membership_"))).toBe(true);
    expect(selected.nodes.some((n) => n.type === "requirementRuleNode")).toBe(true);
    const highlighted = selected.nodes.filter(
      (n) => (n.data as { isRequirementHighlighted?: boolean }).isRequirementHighlighted,
    );
    expect(highlighted.map((n) => n.id).sort()).toEqual(["POL101", "POL201", "POL301"]);
    expect(collectRequirementCourseIds(largeSparseRequirementGroups[0], largeSparseGraphNodes)).toEqual(
      expect.arrayContaining(["POL101", "POL201", "POL301"]),
    );
  });

  it("supports Dependencies and By Requirement modes with a sequence disclaimer", () => {
    const deps = layoutDegreeGraph(largeSparseGraphNodes, largeSparseGraphEdges, {
      mode: "dependencies",
      targetWidth: 1800,
    });
    const req = layoutDegreeGraph(largeSparseGraphNodes, largeSparseGraphEdges, {
      mode: "requirements",
      targetWidth: 1800,
      gridColumns: 4,
    });
    expect(deps.nodes.some((n) => n.type === "sectionHeaderNode")).toBe(true);
    const disclaimer = req.nodes.find((n) => n.id === "requirements-mode-disclaimer");
    expect(disclaimer).toBeDefined();
    expect(String(disclaimer?.data.title)).toMatch(/not a semester sequence/i);
    expect(req.nodes.some((n) => String(n.id).startsWith("lane-header-"))).toBe(true);
  });

  it("keeps export bounds covering every visible node", () => {
    const { nodes, edges } = layoutDegreeGraph(largeSparseGraphNodes, largeSparseGraphEdges, {
      targetWidth: 1800,
      gridColumns: 5,
    });
    const bounds = getVisibleGraphBounds(nodes, 40);
    for (const node of nodes) {
      const width = typeof node.style?.width === "number" ? node.style.width : COURSE_NODE_WIDTH;
      const height = typeof node.style?.height === "number" ? node.style.height : COURSE_NODE_HEIGHT;
      expect(node.position.x).toBeGreaterThanOrEqual(bounds.minX);
      expect(node.position.y).toBeGreaterThanOrEqual(bounds.minY);
      expect(node.position.x + width).toBeLessThanOrEqual(bounds.maxX);
      expect(node.position.y + height).toBeLessThanOrEqual(bounds.maxY);
    }

    const svg = generateGraphSvgString({
      programTitle: "Political Science (sparse fixture)",
      catalogYear: "2025-2026",
      sourceName: "Test Fixture",
      laidOutNodes: nodes,
      laidOutEdges: edges,
    });
    expect(svg).toContain("<svg");
    expect(svg).toContain("POL 101");
    expect(svg).toContain("General Education");
    expect(svg).toContain("Unofficial Tool");
  });

  it("leaves starting and critical insights unchanged by layout", () => {
    const before = buildDegreeGraph(largeSparseGraphNodes, largeSparseGraphEdges);
    layoutDegreeGraph(largeSparseGraphNodes, largeSparseGraphEdges, {
      mode: "dependencies",
      selectedRequirementId: "major-core",
      requirementGroups: largeSparseRequirementGroups,
    });
    const after = buildDegreeGraph(largeSparseGraphNodes, largeSparseGraphEdges);
    expect(after.insights.startingCourses).toEqual(before.insights.startingCourses);
    expect(after.insights.criticalCourses).toEqual(before.insights.criticalCourses);
    expect(after.insights.longestPath).toEqual(before.insights.longestPath);
    expect(after.insights.hasCycle).toBe(before.insights.hasCycle);

    const cs = fixturePrograms.find((p) => p.slug === "computer-science-bs")!;
    const csBefore = buildDegreeGraph(cs.nodes, cs.edges);
    layoutDegreeGraph(cs.nodes, cs.edges, { mode: "requirements" });
    const csAfter = buildDegreeGraph(cs.nodes, cs.edges);
    expect(csAfter.insights).toEqual(csBefore.insights);
  });

  it("never uses membership edges for connected components", () => {
    const withMembership = [
      ...largeSparseGraphEdges,
      {
        id: "membership_fake",
        source: "GE100",
        target: "POL300",
        type: "requirement_membership" as const,
      },
    ];
    const without = buildConnectedComponents(
      largeSparseGraphNodes.map((n) => n.id),
      largeSparseGraphEdges,
    );
    const withMem = buildConnectedComponents(
      largeSparseGraphNodes.map((n) => n.id),
      withMembership,
    );
    expect(withMem.map((c) => c.sort().join(",")).sort()).toEqual(
      without.map((c) => c.sort().join(",")).sort(),
    );
  });
});

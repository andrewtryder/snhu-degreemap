import { describe, it, expect } from "vitest";
import {
  deduplicateCourseNodes,
  detectCycles,
  identifyStartingCourses,
  identifyCriticalCourses,
  calculateLongestKnownPath,
  buildDegreeGraph,
} from "@/lib/graphTransformer";
import { CourseNodeData, PrerequisiteEdgeData, RequirementGroup } from "@/types/program";

describe("graphTransformer Analysis Engine", () => {
  const sampleNodes: CourseNodeData[] = [
    { id: "CS110", code: "CS 110", title: "Intro to CS", credits: 3, groupCode: "core", groupName: "Core", groupCategory: "core" },
    { id: "CS110", code: "CS 110", title: "Intro to CS (Duplicate)", credits: 3, groupCode: "core", groupName: "Core", groupCategory: "core" },
    { id: "CS210", code: "CS 210", title: "Programming Languages", credits: 3, groupCode: "major", groupName: "Major", groupCategory: "major" },
    { id: "CS300", code: "CS 300", title: "Data Structures", credits: 3, groupCode: "major", groupName: "Major", groupCategory: "major" },
    { id: "CS499", code: "CS 499", title: "Capstone", credits: 3, groupCode: "major", groupName: "Major", groupCategory: "major" },
  ];

  const sampleEdges: PrerequisiteEdgeData[] = [
    { id: "e1", source: "CS110", target: "CS210", type: "prerequisite" },
    { id: "e2", source: "CS210", target: "CS300", type: "prerequisite" },
    { id: "e3", source: "CS300", target: "CS499", type: "prerequisite" },
  ];

  it("deduplicates course nodes by unique ID", () => {
    const deduplicated = deduplicateCourseNodes(sampleNodes);
    expect(deduplicated).toHaveLength(4);
  });

  it("identifies starting courses with zero prerequisite in-degree", () => {
    const starting = identifyStartingCourses(sampleNodes, sampleEdges);
    expect(starting).toContain("CS 110");
    expect(starting).not.toContain("CS 210");
  });

  it("identifies critical courses with multiple downstream dependencies", () => {
    const multiEdges: PrerequisiteEdgeData[] = [
      { id: "e1", source: "CS110", target: "CS210", type: "prerequisite" },
      { id: "e2", source: "CS110", target: "CS300", type: "prerequisite" },
    ];
    const critical = identifyCriticalCourses(sampleNodes, multiEdges);
    expect(critical).toContain("CS 110");
  });

  it("calculates longest prerequisite path length and order", () => {
    const { longestPath, longestPathLength } = calculateLongestKnownPath(sampleNodes, sampleEdges);
    expect(longestPathLength).toBe(4);
    expect(longestPath).toEqual(["CS 110", "CS 210", "CS 300", "CS 499"]);
  });

  it("detects circular prerequisite relationships", () => {
    const cycleEdges: PrerequisiteEdgeData[] = [
      { id: "e1", source: "CS110", target: "CS210", type: "prerequisite" },
      { id: "e2", source: "CS210", target: "CS110", type: "prerequisite" },
    ];
    const { hasCycle, cycleNodes } = detectCycles(sampleNodes, cycleEdges);
    expect(hasCycle).toBe(true);
    expect(cycleNodes.length).toBeGreaterThan(0);
  });

  it("builds a complete degree graph model with insights", () => {
    const graph = buildDegreeGraph(sampleNodes, sampleEdges);
    expect(graph.nodes.length).toBe(4);
    expect(graph.nodes.every((node) => node.nodeType === "course")).toBe(true);
    expect(graph.insights.startingCourses).toContain("CS 110");
    expect(graph.insights.longestPathLength).toBe(4);
  });

  it("keeps corequisites, external nodes, and unresolved nodes out of sequence insights", () => {
    const nodes: CourseNodeData[] = [
      { id: "BUS100", code: "BUS 100", title: "Business", credits: 3, groupCode: "core", groupName: "Core", groupCategory: "core", resolutionStatus: "resolved" },
      { id: "BUS200", code: "BUS 200", title: "Business II", credits: 3, groupCode: "core", groupName: "Core", groupCategory: "core", resolutionStatus: "resolved" },
      { id: "ACC201", code: "ACC 201", title: "External", credits: null, groupCode: "external", groupName: "External Prerequisites", groupCategory: "other", isExternal: true, resolutionStatus: "unavailable" },
      { id: "PSY300", code: "PSY 300", title: "Unavailable", credits: 3, groupCode: "major", groupName: "Major", groupCategory: "major", resolutionStatus: "failed" },
    ];
    const edges: PrerequisiteEdgeData[] = [
      { id: "coreq", source: "BUS100", target: "BUS200", type: "corequisite" },
      { id: "external", source: "ACC201", target: "BUS200", type: "prerequisite" },
    ];

    const graph = buildDegreeGraph(nodes, edges);
    expect(graph.insights.startingCourses).toEqual(["BUS 100"]);
    expect(graph.insights.longestPath).toEqual(["BUS 100"]);
    expect(graph.insights.totalKnownCourses).toBe(2);
  });

  it("adds membership edges for explicit options without changing prerequisite insights", () => {
    const group: RequirementGroup = {
      id: "graduate-options",
      title: "Graduate options",
      category: "elective",
      totalCredits: 12,
      ruleType: "choose_credits",
      minimumCredits: 12,
      ruleMetadata: { explicitCourseCodes: ["CS 210", "CS 300"], eligibleSubjectCodes: ["CS"], minimumCourseLevel: 200, maximumCourseLevel: 499 },
      items: [],
      colorTheme: { bg: "", border: "", text: "", badgeBg: "", badgeText: "" },
    };
    const graph = buildDegreeGraph(sampleNodes, sampleEdges, [group]);
    const membership = graph.edges.filter((edge) => edge.type === "requirement_membership");

    expect(graph.nodes.some((node) => node.nodeType === "requirement_group")).toBe(true);
    expect(membership).toHaveLength(2);
    expect(membership.every((edge) => edge.type !== "prerequisite")).toBe(true);
    expect(graph.insights.longestPath).toEqual(["CS 110", "CS 210", "CS 300", "CS 499"]);
  });
});

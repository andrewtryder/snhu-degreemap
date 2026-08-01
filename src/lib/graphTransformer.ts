import { CourseNodeData, PrerequisiteEdgeData, RequirementGroup } from "@/types/program";
import { normalizeCourseCode } from "@/lib/courseCode";
import {
  DegreeGraphNodeData,
  DegreeGraphEdgeData,
  DegreeGraphInsights,
  CompleteDegreeGraph,
} from "@/types/degreeGraph";

export function deduplicateCourseNodes(nodesData: CourseNodeData[]): CourseNodeData[] {
  const seen = new Set<string>();
  const deduplicated: CourseNodeData[] = [];

  for (const node of nodesData) {
    if (!seen.has(node.id)) {
      seen.add(node.id);
      deduplicated.push(node);
    }
  }

  return deduplicated;
}

export function detectCycles(
  nodesData: CourseNodeData[],
  edgesData: PrerequisiteEdgeData[]
): { hasCycle: boolean; cycleNodes: string[] } {
  const adj = new Map<string, string[]>();
  for (const n of nodesData) {
    adj.set(n.id, []);
  }
  for (const e of edgesData) {
    if (adj.has(e.source)) {
      adj.get(e.source)!.push(e.target);
    }
  }

  const visited = new Set<string>();
  const recStack = new Set<string>();
  const cycleNodes: string[] = [];

  function dfs(nodeId: string): boolean {
    visited.add(nodeId);
    recStack.add(nodeId);

    const neighbors = adj.get(nodeId) || [];
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        if (dfs(neighbor)) return true;
      } else if (recStack.has(neighbor)) {
        cycleNodes.push(neighbor);
        return true;
      }
    }

    recStack.delete(nodeId);
    return false;
  }

  for (const n of nodesData) {
    if (!visited.has(n.id)) {
      if (dfs(n.id)) {
        return { hasCycle: true, cycleNodes };
      }
    }
  }

  return { hasCycle: false, cycleNodes: [] };
}

export function identifyStartingCourses(
  nodesData: CourseNodeData[],
  edgesData: PrerequisiteEdgeData[]
): string[] {
  const targets = new Set(edgesData.filter((e) => e.type === "prerequisite").map((e) => e.target));

  return nodesData
    .filter(
      (n) =>
        !n.isPlaceholder &&
        !n.isExternal &&
        (n.resolutionStatus || "resolved") === "resolved" &&
        !targets.has(n.id) &&
        !targets.has(n.code)
    )
    .map((n) => n.code);
}

export function identifyCriticalCourses(
  nodesData: CourseNodeData[],
  edgesData: PrerequisiteEdgeData[]
): string[] {
  const outDegreeMap = new Map<string, number>();

  for (const e of edgesData) {
    if (e.type === "prerequisite") {
      outDegreeMap.set(e.source, (outDegreeMap.get(e.source) || 0) + 1);
    }
  }

  return nodesData
    .filter(
      (n) =>
        !n.isExternal &&
        (n.resolutionStatus || "resolved") === "resolved" &&
        (outDegreeMap.get(n.id) || outDegreeMap.get(n.code) || 0) >= 2
    )
    .map((n) => n.code);
}

export function calculateLongestKnownPath(
  nodesData: CourseNodeData[],
  edgesData: PrerequisiteEdgeData[]
): { longestPath: string[]; longestPathLength: number } {
  const adj = new Map<string, string[]>();
  const inDegree = new Map<string, number>();

  for (const n of nodesData) {
    adj.set(n.id, []);
    inDegree.set(n.id, 0);
  }

  for (const e of edgesData) {
    if (e.type === "prerequisite" && adj.has(e.source) && inDegree.has(e.target)) {
      adj.get(e.source)!.push(e.target);
      inDegree.set(e.target, (inDegree.get(e.target) || 0) + 1);
    }
  }

  const dist = new Map<string, number>();
  const parent = new Map<string, string | null>();

  for (const n of nodesData) {
    dist.set(n.id, 1);
    parent.set(n.id, null);
  }

  // Queue for BFS/topological sort
  const queue: string[] = [];
  for (const [id, deg] of inDegree.entries()) {
    if (deg === 0) queue.push(id);
  }

  let maxDist = 1;
  let maxEndNode = nodesData[0]?.id || "";

  while (queue.length > 0) {
    const u = queue.shift()!;
    const uDist = dist.get(u) || 1;

    for (const v of adj.get(u) || []) {
      if (uDist + 1 > (dist.get(v) || 1)) {
        dist.set(v, uDist + 1);
        parent.set(v, u);

        if (uDist + 1 > maxDist) {
          maxDist = uDist + 1;
          maxEndNode = v;
        }
      }

      inDegree.set(v, (inDegree.get(v) || 0) - 1);
      if (inDegree.get(v) === 0) {
        queue.push(v);
      }
    }
  }

  // Reconstruct path
  const path: string[] = [];
  let curr: string | null = maxEndNode;
  while (curr) {
    const node = nodesData.find((n) => n.id === curr);
    if (node) path.unshift(node.code);
    curr = parent.get(curr) || null;
  }

  return { longestPath: path, longestPathLength: maxDist };
}

export function buildDegreeGraph(
  rawNodes: CourseNodeData[],
  rawEdges: PrerequisiteEdgeData[],
  requirementGroups: RequirementGroup[] = []
): CompleteDegreeGraph {
  const nodesData = deduplicateCourseNodes(rawNodes);
  const analyzableNodes = nodesData.filter(
    (node) => !node.isExternal && (node.resolutionStatus || "resolved") === "resolved"
  );
  const prerequisiteEdges = rawEdges.filter((edge) => edge.type === "prerequisite");
  const startingCourses = identifyStartingCourses(analyzableNodes, prerequisiteEdges);
  const criticalCourses = identifyCriticalCourses(analyzableNodes, prerequisiteEdges);
  const { longestPath, longestPathLength } = calculateLongestKnownPath(analyzableNodes, prerequisiteEdges);
  const { hasCycle, cycleNodes } = detectCycles(analyzableNodes, prerequisiteEdges);

  const startingSet = new Set(startingCourses);
  const criticalSet = new Set(criticalCourses);

  const nodes: DegreeGraphNodeData[] = nodesData.map((node) => ({
    ...node,
    nodeType: node.isPlaceholder ? "elective_placeholder" : "course",
    isStartingCourse: startingSet.has(node.code),
    isCriticalPath: criticalSet.has(node.code),
  }));

  const edges: DegreeGraphEdgeData[] = rawEdges.map((edge) => ({
    ...edge,
    edgeType: (edge.type as DegreeGraphEdgeData["edgeType"]) || "prerequisite",
  }));

  const courseByCode = new Map(nodesData.map((node) => [normalizeCourseCode(node.code), node]));
  const addRequirement = (
    group: Pick<RequirementGroup, "id" | "title" | "category" | "ruleType" | "minimumSelections" | "minimumCredits" | "ruleMetadata" | "sourceText" | "items">,
    parentRequirementId?: string
  ) => {
    const id = `requirement_${group.id}`;
    nodes.push({
      id,
      code: "Requirement",
      title: group.title,
      credits: null,
      groupCode: group.id,
      groupName: group.title,
      groupCategory: group.category,
      resolutionStatus: "resolved",
      nodeType: "requirement_group",
      parentRequirementId,
      ruleMetadata: {
        ...(group.ruleMetadata || {}),
        minimumCredits: group.minimumCredits ?? group.ruleMetadata?.minimumCredits,
        minimumSelections: group.minimumSelections ?? group.ruleMetadata?.minimumSelections,
        sourceText: group.sourceText || group.ruleMetadata?.sourceText,
      },
      sourceText: group.sourceText,
    });

    for (const code of group.ruleMetadata?.explicitCourseCodes || []) {
      const course = courseByCode.get(normalizeCourseCode(code));
      if (course) {
        edges.push({
          id: `membership_${id}_${course.id}`,
          source: id,
          target: course.id,
          type: "requirement_membership",
          edgeType: "requirement_membership",
          label: "option within requirement",
        });
      }
    }

    group.items.forEach((item, index) => {
      if (item.type === "group") {
        addRequirement({
          id: item.id,
          title: item.title,
          category: group.category,
          ruleType: item.ruleType,
          minimumSelections: item.minimumSelections,
          minimumCredits: item.minimumCredits,
          ruleMetadata: item.ruleMetadata,
          sourceText: item.sourceText,
          items: item.subItems || [],
        }, id);
      } else if (item.sourceText || item.textKind) {
        nodes.push({
          id: `information_${group.id}_${index}`,
          code: item.textKind === "policy" ? "Policy note" : "Information",
          title: item.title,
          credits: null,
          groupCode: group.id,
          groupName: group.title,
          groupCategory: group.category,
          resolutionStatus: "resolved",
          nodeType: item.textKind === "unparsed" ? "unparsed_requirement" : "informational",
          parentRequirementId: id,
          sourceText: item.sourceText || item.title,
          textKind: item.textKind || "informational",
        });
      }
    });
  };

  requirementGroups.forEach((group) => addRequirement(group));

  const insights: DegreeGraphInsights = {
    startingCourses,
    criticalCourses,
    longestPath,
    longestPathLength,
    hasCycle,
    cycleNodes,
    totalKnownCourses: analyzableNodes.filter((n) => !n.isPlaceholder).length,
  };

  return { nodes, edges, insights };
}

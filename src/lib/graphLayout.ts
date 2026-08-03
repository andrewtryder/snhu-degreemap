import dagre from "@dagrejs/dagre";
import { MarkerType, type Edge, type Node } from "@xyflow/react";
import { CourseNodeData, PrerequisiteEdgeData, GroupCategory, RequirementGroup } from "@/types/program";
import { DegreeGraphNodeData } from "@/types/degreeGraph";
import { normalizeCourseCode } from "@/lib/courseCode";
import {
  buildConnectedComponents,
  clampTargetWidth,
  COURSE_NODE_HEIGHT,
  COURSE_NODE_WIDTH,
  filterGraphByGroup,
  GraphLayoutMode,
  isCourseLikeNode,
  isDependencyEdgeType,
  LayoutBlock,
  layoutIsolatedCourseGrid,
  layoutRequirementSwimlanes,
  LAYOUT_MIN_TARGET_WIDTH,
  measureNodeBounds,
  normalizeBlockOrigin,
  packLayoutBlocks,
  resolveGridColumns,
} from "@/lib/graphComponentLayout";

export {
  clampTargetWidth,
  resolveGridColumns,
  measureNodeBounds,
  packLayoutBlocks,
  buildConnectedComponents,
  filterGraphByGroup,
  layoutIsolatedCourseGrid,
  CATEGORY_SECTION_LABELS,
  LAYOUT_MIN_TARGET_WIDTH,
  LAYOUT_MAX_TARGET_WIDTH,
  COURSE_NODE_WIDTH,
  COURSE_NODE_HEIGHT,
  boundsOverlap,
  type GraphLayoutMode,
  type LayoutBounds,
  type LayoutBlock,
} from "@/lib/graphComponentLayout";

function nodeSize(node: DegreeGraphNodeData | CourseNodeData) {
  const nodeType = "nodeType" in node ? node.nodeType : "course";
  if (nodeType === "requirement_group") return { width: 300, height: 150 };
  if (nodeType === "informational" || nodeType === "unparsed_requirement") {
    return { width: 260, height: 110 };
  }
  return { width: COURSE_NODE_WIDTH, height: COURSE_NODE_HEIGHT };
}

export interface CategoryPalette {
  bg: string;
  border: string;
  codeColor: string;
  titleColor: string;
  badgeBg: string;
  badgeText: string;
}

export const CATEGORY_PALETTES: Record<GroupCategory, CategoryPalette> = {
  gened: {
    bg: "#dbe1ff",
    border: "#003087",
    codeColor: "#001d59",
    titleColor: "#1b1c1c",
    badgeBg: "#003087",
    badgeText: "#ffffff",
  },
  core: {
    bg: "#e8f5e9",
    border: "#004112",
    codeColor: "#002908",
    titleColor: "#1b1c1c",
    badgeBg: "#004112",
    badgeText: "#ffffff",
  },
  major: {
    bg: "#f3e8ff",
    border: "#7e22ce",
    codeColor: "#581c87",
    titleColor: "#1b1c1c",
    badgeBg: "#7e22ce",
    badgeText: "#ffffff",
  },
  elective: {
    bg: "#fef3c7",
    border: "#d97706",
    codeColor: "#78350f",
    titleColor: "#1b1c1c",
    badgeBg: "#d97706",
    badgeText: "#ffffff",
  },
  other: {
    bg: "#f0eded",
    border: "#747683",
    codeColor: "#1b1c1c",
    titleColor: "#1b1c1c",
    badgeBg: "#747683",
    badgeText: "#ffffff",
  },
};

export interface LayoutDegreeGraphOptions {
  mode?: GraphLayoutMode;
  groupFilter?: GroupCategory | "all";
  targetWidth?: number;
  gridColumns?: number;
  selectedRequirementId?: string | null;
  showPrerequisiteOverlays?: boolean;
  /** When set, membership edges for this requirement are rendered (never used for Dagre). */
  requirementGroups?: RequirementGroup[];
  selectedCourseIds?: Iterable<string>;
}

export function buildGraphNodesAndEdges(
  nodesData: Array<CourseNodeData | DegreeGraphNodeData>,
  edgesData: PrerequisiteEdgeData[],
): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = nodesData.map((course) => {
    const palette = CATEGORY_PALETTES[course.groupCategory] || CATEGORY_PALETTES.other;
    const nodeType = "nodeType" in course ? course.nodeType : "course";

    return {
      id: course.id,
      type:
        nodeType === "requirement_group"
          ? "requirementRuleNode"
          : nodeType === "informational" || nodeType === "unparsed_requirement"
            ? "informationalNode"
            : "courseNode",
      position: { x: 0, y: 0 },
      data: {
        ...course,
        palette,
      },
      style: nodeSize(course),
    };
  });

  const edges: Edge[] = edgesData.map((edge) => styleEdge(edge));

  return { nodes, edges };
}

function styleEdge(edge: PrerequisiteEdgeData): Edge {
  const isCoreq = edge.type === "corequisite";
  const isRec = edge.type === "recommended";
  const isMembership = edge.type === "requirement_membership";

  return {
    id: edge.id,
    source: edge.source,
    target: edge.target,
    type: "smoothstep",
    animated: !isRec && !isMembership,
    style: {
      stroke: isMembership ? "#9ca3af" : isCoreq ? "#2c6cf0" : isRec ? "#d97706" : "#747683",
      strokeWidth: isMembership ? 1.5 : 2,
      strokeDasharray: isMembership ? "2,4" : isCoreq ? "5,5" : isRec ? "2,2" : undefined,
    },
    markerEnd: isMembership
      ? undefined
      : {
          type: MarkerType.ArrowClosed,
          color: isCoreq ? "#2c6cf0" : isRec ? "#d97706" : "#747683",
        },
    label: undefined,
    ariaLabel: isMembership ? "option within requirement" : undefined,
  };
}

/**
 * Dagre layout for a single connected component.
 * Only prerequisite edges affect ranks; corequisite edges are excluded from Dagre.
 */
export function applyDagreLayout(
  nodes: Node[],
  edges: Edge[],
  direction: "TB" | "LR" = "TB",
): Node[] {
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));

  dagreGraph.setGraph({
    rankdir: direction,
    nodesep: 50,
    ranksep: 90,
  });

  nodes.forEach((node) => {
    const size = nodeSize(node.data as unknown as CourseNodeData);
    dagreGraph.setNode(node.id, size);
  });

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  dagre.layout(dagreGraph);

  return nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    const size = nodeSize(node.data as unknown as CourseNodeData);
    return {
      ...node,
      position: {
        x: nodeWithPosition.x - size.width / 2,
        y: nodeWithPosition.y - size.height / 2,
      },
    };
  });
}

function layoutConnectedComponentBlock(
  componentNodes: Node[],
  componentEdges: PrerequisiteEdgeData[],
  direction: "TB" | "LR",
): LayoutBlock {
  const prereqLayoutEdges = componentEdges
    .filter((edge) => edge.type === "prerequisite" || edge.type === undefined)
    .map(styleEdge);
  const laidOut = applyDagreLayout(componentNodes, prereqLayoutEdges, direction);
  const { nodes, width, height } = normalizeBlockOrigin(laidOut);
  return {
    id: `component-${componentNodes.map((n) => n.id).sort().join("-").slice(0, 80)}`,
    nodes,
    width,
    height,
  };
}

export function collectRequirementCourseIds(
  group: RequirementGroup,
  courseNodes: Array<CourseNodeData | DegreeGraphNodeData>,
): string[] {
  const byCode = new Map(
    courseNodes.map((node) => [normalizeCourseCode(node.code), node.id]),
  );
  const ids = new Set<string>();

  const addCodes = (codes: string[] | undefined) => {
    for (const code of codes || []) {
      const id = byCode.get(normalizeCourseCode(code));
      if (id) ids.add(id);
    }
  };

  addCodes(group.ruleMetadata?.explicitCourseCodes);

  const walk = (items: RequirementGroup["items"]) => {
    for (const item of items) {
      addCodes(item.courses);
      addCodes(item.ruleMetadata?.explicitCourseCodes);
      if (item.subItems) walk(item.subItems);
    }
  };
  walk(group.items);

  return [...ids];
}

function findRequirementGroup(
  groups: RequirementGroup[],
  requirementId: string,
): RequirementGroup | undefined {
  const stack = [...groups];
  while (stack.length > 0) {
    const group = stack.pop()!;
    if (group.id === requirementId || `requirement_${group.id}` === requirementId) {
      return group;
    }
    for (const item of group.items) {
      if (item.type === "group") {
        stack.push({
          id: item.id,
          title: item.title,
          category: group.category,
          colorTheme: group.colorTheme,
          totalCredits: item.credits,
          ruleType: item.ruleType,
          minimumSelections: item.minimumSelections,
          maximumSelections: item.maximumSelections,
          minimumCredits: item.minimumCredits,
          ruleMetadata: item.ruleMetadata,
          sourceText: item.sourceText,
          items: item.subItems || [],
        });
      }
    }
  }
  return undefined;
}

function buildSelectedMembershipArtifacts(
  selectedRequirementId: string,
  requirementGroups: RequirementGroup[],
  courseNodes: Array<CourseNodeData | DegreeGraphNodeData>,
  positionedCourseNodes: Node[],
): { nodes: Node[]; edges: Edge[]; selectedCourseIds: Set<string> } {
  const group = findRequirementGroup(requirementGroups, selectedRequirementId);
  if (!group) return { nodes: [], edges: [], selectedCourseIds: new Set() };

  const courseIds = collectRequirementCourseIds(group, courseNodes);
  const selectedCourseIds = new Set(courseIds);
  const visibleCourses = positionedCourseNodes.filter((node) => selectedCourseIds.has(node.id));
  if (visibleCourses.length === 0) {
    return { nodes: [], edges: [], selectedCourseIds };
  }

  const bounds = measureNodeBounds(visibleCourses);
  const requirementNodeId = `requirement_${group.id}`;
  const requirementNode: Node = {
    id: requirementNodeId,
    type: "requirementRuleNode",
    position: {
      x: bounds.minX,
      y: Math.max(0, bounds.minY - 170),
    },
    data: {
      id: requirementNodeId,
      code: "Requirement",
      title: group.title,
      credits: group.totalCredits,
      groupCode: group.id,
      groupName: group.title,
      groupCategory: group.category,
      nodeType: "requirement_group",
      ruleMetadata: group.ruleMetadata,
      sourceText: group.sourceText,
      palette: CATEGORY_PALETTES[group.category] || CATEGORY_PALETTES.other,
    },
    style: { width: 300, height: 120 },
  };

  const membershipEdges = courseIds
    .filter((id) => positionedCourseNodes.some((node) => node.id === id))
    .map((courseId) =>
      styleEdge({
        id: `membership_${group.id}_${courseId}`,
        source: requirementNodeId,
        target: courseId,
        type: "requirement_membership",
      }),
    );

  return {
    nodes: [requirementNode],
    edges: membershipEdges,
    selectedCourseIds,
  };
}

export function layoutDegreeGraph(
  nodesData: Array<CourseNodeData | DegreeGraphNodeData>,
  edgesData: PrerequisiteEdgeData[],
  directionOrOptions: "TB" | "LR" | LayoutDegreeGraphOptions = "TB",
): { nodes: Node[]; edges: Edge[]; selectedCourseIds?: string[] } {
  const options: LayoutDegreeGraphOptions =
    typeof directionOrOptions === "string"
      ? { mode: "dependencies" }
      : directionOrOptions;
  const direction: "TB" | "LR" =
    typeof directionOrOptions === "string" ? directionOrOptions : "TB";

  const mode = options.mode ?? "dependencies";
  const groupFilter = options.groupFilter ?? "all";
  const targetWidth = clampTargetWidth(options.targetWidth ?? LAYOUT_MIN_TARGET_WIDTH);
  const gridColumns = options.gridColumns ?? resolveGridColumns(targetWidth);
  const showOverlays = options.showPrerequisiteOverlays ?? true;

  const { nodes: filteredNodeData, edges: filteredEdgeData } = filterGraphByGroup(
    nodesData,
    edgesData,
    groupFilter,
  );

  // Never feed requirement / informational nodes into the default canvas layout.
  const courseOnlyData = filteredNodeData.filter(isCourseLikeNode);
  const { nodes: baseNodes } = buildGraphNodesAndEdges(courseOnlyData, []);

  if (mode === "requirements") {
    const { nodes: swimlaneNodes } = layoutRequirementSwimlanes(baseNodes, {
      columns: gridColumns,
    });
    const dependencyEdges = showOverlays
      ? filteredEdgeData.filter((edge) => isDependencyEdgeType(edge.type)).map(styleEdge)
      : [];

    let nodes = swimlaneNodes;
    let edges = dependencyEdges;
    let selectedCourseIds: string[] | undefined;

    if (options.selectedRequirementId && options.requirementGroups) {
      const membership = buildSelectedMembershipArtifacts(
        options.selectedRequirementId,
        options.requirementGroups,
        courseOnlyData,
        nodes,
      );
      selectedCourseIds = [...membership.selectedCourseIds];
      nodes = [
        ...nodes.map((node) =>
          membership.selectedCourseIds.has(node.id)
            ? {
                ...node,
                data: { ...node.data, isRequirementHighlighted: true },
              }
            : node,
        ),
        ...membership.nodes,
      ];
      edges = [...edges, ...membership.edges];
    }

    return { nodes, edges, selectedCourseIds };
  }

  // Dependencies mode
  const nodeIds = baseNodes.map((node) => node.id);
  const components = buildConnectedComponents(nodeIds, filteredEdgeData);
  const nodeById = new Map(baseNodes.map((node) => [node.id, node]));

  const multiBlocks: LayoutBlock[] = [];
  const isolatedNodes: Node[] = [];

  for (const component of components) {
    if (component.length >= 2) {
      const componentNodes = component.map((id) => nodeById.get(id)!).filter(Boolean);
      const componentEdges = filteredEdgeData.filter(
        (edge) => component.includes(edge.source) && component.includes(edge.target),
      );
      multiBlocks.push(layoutConnectedComponentBlock(componentNodes, componentEdges, direction));
    } else if (component.length === 1) {
      isolatedNodes.push(nodeById.get(component[0])!);
    }
  }

  const isolatedBlocks = layoutIsolatedCourseGrid(isolatedNodes, { columns: gridColumns });
  const packedNodes = packLayoutBlocks([...multiBlocks, ...isolatedBlocks], {
    targetWidth,
  });

  const dependencyEdges = filteredEdgeData
    .filter((edge) => isDependencyEdgeType(edge.type))
    .map(styleEdge);

  let nodes = packedNodes;
  let edges = dependencyEdges;
  let selectedCourseIds: string[] | undefined;

  if (options.selectedRequirementId && options.requirementGroups) {
    const membership = buildSelectedMembershipArtifacts(
      options.selectedRequirementId,
      options.requirementGroups,
      courseOnlyData,
      nodes,
    );
    selectedCourseIds = [...membership.selectedCourseIds];
    nodes = [
      ...nodes.map((node) =>
        membership.selectedCourseIds.has(node.id)
          ? {
              ...node,
              data: { ...node.data, isRequirementHighlighted: true },
            }
          : node,
      ),
      ...membership.nodes,
    ];
    edges = [...edges, ...membership.edges];
  }

  return { nodes, edges, selectedCourseIds };
}

/** Compute export-safe bounds that include every visible node. */
export function getVisibleGraphBounds(nodes: Node[], padding = 40) {
  const bounds = measureNodeBounds(nodes);
  return {
    minX: bounds.minX - padding,
    minY: bounds.minY - padding,
    maxX: bounds.maxX + padding,
    maxY: bounds.maxY + padding,
    width: bounds.width + padding * 2,
    height: bounds.height + padding * 2,
  };
}

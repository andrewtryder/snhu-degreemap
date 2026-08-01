import dagre from "@dagrejs/dagre";
import { MarkerType, type Edge, type Node } from "@xyflow/react";
import { CourseNodeData, PrerequisiteEdgeData, GroupCategory } from "@/types/program";
import { DegreeGraphNodeData } from "@/types/degreeGraph";

const NODE_WIDTH = 180;
const NODE_HEIGHT = 80;

function nodeSize(node: DegreeGraphNodeData | CourseNodeData) {
  const nodeType = "nodeType" in node ? node.nodeType : "course";
  if (nodeType === "requirement_group") return { width: 300, height: 150 };
  if (nodeType === "informational" || nodeType === "unparsed_requirement") return { width: 260, height: 110 };
  return { width: NODE_WIDTH, height: NODE_HEIGHT };
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

export function buildGraphNodesAndEdges(
  nodesData: Array<CourseNodeData | DegreeGraphNodeData>,
  edgesData: PrerequisiteEdgeData[]
): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = nodesData.map((course) => {
    const palette = CATEGORY_PALETTES[course.groupCategory] || CATEGORY_PALETTES.other;

    return {
      id: course.id,
      type: ("nodeType" in course && course.nodeType === "requirement_group")
        ? "requirementRuleNode"
        : ("nodeType" in course && (course.nodeType === "informational" || course.nodeType === "unparsed_requirement"))
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

  const edges: Edge[] = edgesData.map((edge) => {
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
      markerEnd: isMembership ? undefined : {
        type: MarkerType.ArrowClosed,
        color: isCoreq ? "#2c6cf0" : isRec ? "#d97706" : "#747683",
      },
      // Relationship context remains in the stored edge data and drawer, but
      // labels make dense graphs difficult to read when rendered on paths.
      label: undefined,
      ariaLabel: isMembership ? "option within requirement" : undefined,
    };
  });

  return { nodes, edges };
}

export function applyDagreLayout(
  nodes: Node[],
  edges: Edge[],
  direction: "TB" | "LR" = "TB"
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

  const layouted = nodes.map((node) => {
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

  const positioned = new Map(layouted.map((node) => [node.id, node]));
  return layouted.map((node, index) => {
    const data = node.data as unknown as DegreeGraphNodeData;
    if (!data.parentRequirementId && data.nodeType !== "requirement_group") return node;
    const parent = data.parentRequirementId ? positioned.get(data.parentRequirementId) : undefined;
    if (parent) {
      return { ...node, position: { x: parent.position.x + 340, y: parent.position.y + (index % 3) * 125 } };
    }
    if (data.nodeType === "requirement_group") {
      const course = layouted.find((candidate) => (candidate.data as unknown as CourseNodeData).groupCode === data.groupCode && candidate.id !== node.id);
      if (course) return { ...node, position: { x: course.position.x, y: Math.max(0, course.position.y - 190) } };
    }
    return node;
  });
}

export function layoutDegreeGraph(
  nodesData: Array<CourseNodeData | DegreeGraphNodeData>,
  edgesData: PrerequisiteEdgeData[],
  direction: "TB" | "LR" = "TB"
): { nodes: Node[]; edges: Edge[] } {
  const { nodes, edges } = buildGraphNodesAndEdges(nodesData, edgesData);
  const layoutEdges = edges.filter((edge) => edgesData.find((data) => data.id === edge.id)?.type === "prerequisite");
  const layoutedNodes = applyDagreLayout(nodes, layoutEdges, direction);
  return { nodes: layoutedNodes, edges };
}

import dagre from "@dagrejs/dagre";
import { MarkerType, type Edge, type Node } from "@xyflow/react";
import { CourseNodeData, PrerequisiteEdgeData, GroupCategory } from "@/types/program";

const NODE_WIDTH = 180;
const NODE_HEIGHT = 80;

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
  nodesData: CourseNodeData[],
  edgesData: PrerequisiteEdgeData[]
): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = nodesData.map((course) => {
    const palette = CATEGORY_PALETTES[course.groupCategory] || CATEGORY_PALETTES.other;

    return {
      id: course.id,
      type: "courseNode",
      position: { x: 0, y: 0 },
      data: {
        ...course,
        palette,
      },
      style: {
        width: NODE_WIDTH,
        height: NODE_HEIGHT,
      },
    };
  });

  const edges: Edge[] = edgesData.map((edge) => {
    const isCoreq = edge.type === "corequisite";
    const isRec = edge.type === "recommended";

    return {
      id: edge.id,
      source: edge.source,
      target: edge.target,
      type: "smoothstep",
      animated: !isRec,
      style: {
        stroke: isCoreq ? "#2c6cf0" : isRec ? "#d97706" : "#747683",
        strokeWidth: 2,
        strokeDasharray: isCoreq ? "5,5" : isRec ? "2,2" : undefined,
      },
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color: isCoreq ? "#2c6cf0" : isRec ? "#d97706" : "#747683",
      },
      label: edge.label,
      labelStyle: { fill: "#444652", fontSize: 10, fontWeight: 600 },
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
    dagreGraph.setNode(node.id, { width: NODE_WIDTH, height: NODE_HEIGHT });
  });

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  dagre.layout(dagreGraph);

  return nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    return {
      ...node,
      position: {
        x: nodeWithPosition.x - NODE_WIDTH / 2,
        y: nodeWithPosition.y - NODE_HEIGHT / 2,
      },
    };
  });
}

export function layoutDegreeGraph(
  nodesData: CourseNodeData[],
  edgesData: PrerequisiteEdgeData[],
  direction: "TB" | "LR" = "TB"
): { nodes: Node[]; edges: Edge[] } {
  const { nodes, edges } = buildGraphNodesAndEdges(nodesData, edgesData);
  const layoutedNodes = applyDagreLayout(nodes, edges, direction);
  return { nodes: layoutedNodes, edges };
}

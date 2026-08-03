import type { Node } from "@xyflow/react";
import { CourseNodeData, GroupCategory, PrerequisiteEdgeData } from "@/types/program";
import { DegreeGraphNodeData } from "@/types/degreeGraph";

export const COURSE_NODE_WIDTH = 180;
export const COURSE_NODE_HEIGHT = 80;
export const LAYOUT_MIN_TARGET_WIDTH = 1400;
export const LAYOUT_MAX_TARGET_WIDTH = 2200;
export const LAYOUT_GAP_X = 48;
export const LAYOUT_GAP_Y = 64;
export const GRID_GAP_X = 24;
export const GRID_GAP_Y = 24;
export const SECTION_HEADER_HEIGHT = 40;

export const CATEGORY_ORDER: GroupCategory[] = ["gened", "core", "major", "elective", "other"];

export const CATEGORY_SECTION_LABELS: Record<GroupCategory, string> = {
  gened: "General Education",
  core: "Core",
  major: "Major",
  elective: "Elective",
  other: "Other",
};

export type GraphLayoutMode = "dependencies" | "requirements";

export interface LayoutBlock {
  id: string;
  nodes: Node[];
  width: number;
  height: number;
}

export interface LayoutBounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  width: number;
  height: number;
}

export function clampTargetWidth(width: number): number {
  if (!Number.isFinite(width) || width <= 0) return LAYOUT_MIN_TARGET_WIDTH;
  return Math.min(LAYOUT_MAX_TARGET_WIDTH, Math.max(LAYOUT_MIN_TARGET_WIDTH, Math.round(width)));
}

export function resolveGridColumns(viewportWidth: number, forExport = false): number {
  if (forExport) return 5;
  if (viewportWidth < 640) return 2;
  if (viewportWidth < 1024) return 3;
  if (viewportWidth < 1400) return 4;
  return 5;
}

export function isDependencyEdgeType(type: PrerequisiteEdgeData["type"] | undefined): boolean {
  return type === "prerequisite" || type === "corequisite" || type === undefined;
}

export function isCourseLikeNode(node: CourseNodeData | DegreeGraphNodeData): boolean {
  const nodeType = "nodeType" in node ? node.nodeType : "course";
  return nodeType === "course" || nodeType === "elective_placeholder" || nodeType === undefined;
}

export function filterGraphByGroup(
  nodesData: Array<CourseNodeData | DegreeGraphNodeData>,
  edgesData: PrerequisiteEdgeData[],
  groupFilter: GroupCategory | "all" = "all",
): {
  nodes: Array<CourseNodeData | DegreeGraphNodeData>;
  edges: PrerequisiteEdgeData[];
} {
  const courseNodes = nodesData.filter(isCourseLikeNode);
  const nodes =
    groupFilter === "all"
      ? courseNodes
      : courseNodes.filter((node) => node.groupCategory === groupFilter);
  const ids = new Set(nodes.map((node) => node.id));
  const edges = edgesData.filter(
    (edge) =>
      ids.has(edge.source) &&
      ids.has(edge.target) &&
      edge.type !== "requirement_membership",
  );
  return { nodes, edges };
}

/**
 * Undirected connected components using prerequisite + corequisite edges only.
 * Membership and recommended edges never define components.
 */
export function buildConnectedComponents(
  nodeIds: string[],
  edges: PrerequisiteEdgeData[],
): string[][] {
  const idSet = new Set(nodeIds);
  const adj = new Map<string, Set<string>>();
  for (const id of nodeIds) adj.set(id, new Set());

  for (const edge of edges) {
    if (!isDependencyEdgeType(edge.type)) continue;
    if (!idSet.has(edge.source) || !idSet.has(edge.target)) continue;
    adj.get(edge.source)!.add(edge.target);
    adj.get(edge.target)!.add(edge.source);
  }

  const visited = new Set<string>();
  const components: string[][] = [];

  for (const id of nodeIds) {
    if (visited.has(id)) continue;
    const stack = [id];
    visited.add(id);
    const component: string[] = [];
    while (stack.length > 0) {
      const current = stack.pop()!;
      component.push(current);
      for (const neighbor of adj.get(current) || []) {
        if (visited.has(neighbor)) continue;
        visited.add(neighbor);
        stack.push(neighbor);
      }
    }
    components.push(component);
  }

  return components;
}

export function measureNodeBounds(nodes: Node[]): LayoutBounds {
  if (nodes.length === 0) {
    return { minX: 0, minY: 0, maxX: 0, maxY: 0, width: 0, height: 0 };
  }

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const node of nodes) {
    const width =
      typeof node.style?.width === "number"
        ? node.style.width
        : COURSE_NODE_WIDTH;
    const height =
      typeof node.style?.height === "number"
        ? node.style.height
        : COURSE_NODE_HEIGHT;
    minX = Math.min(minX, node.position.x);
    minY = Math.min(minY, node.position.y);
    maxX = Math.max(maxX, node.position.x + width);
    maxY = Math.max(maxY, node.position.y + height);
  }

  return {
    minX,
    minY,
    maxX,
    maxY,
    width: maxX - minX,
    height: maxY - minY,
  };
}

export function translateNodes(nodes: Node[], dx: number, dy: number): Node[] {
  if (dx === 0 && dy === 0) return nodes;
  return nodes.map((node) => ({
    ...node,
    position: { x: node.position.x + dx, y: node.position.y + dy },
  }));
}

export function normalizeBlockOrigin(nodes: Node[]): { nodes: Node[]; width: number; height: number } {
  const bounds = measureNodeBounds(nodes);
  const normalized = translateNodes(nodes, -bounds.minX, -bounds.minY);
  return { nodes: normalized, width: bounds.width, height: bounds.height };
}

/**
 * Pack layout blocks into rows with a bounded target width.
 * Short rows are centered. Blocks never overlap.
 */
export function packLayoutBlocks(
  blocks: LayoutBlock[],
  options: { targetWidth: number; gapX?: number; gapY?: number } = {
    targetWidth: LAYOUT_MIN_TARGET_WIDTH,
  },
): Node[] {
  const gapX = options.gapX ?? LAYOUT_GAP_X;
  const gapY = options.gapY ?? LAYOUT_GAP_Y;
  const targetWidth = clampTargetWidth(options.targetWidth);

  if (blocks.length === 0) return [];

  type Row = { blocks: LayoutBlock[]; width: number; height: number };
  const rows: Row[] = [];
  let current: Row = { blocks: [], width: 0, height: 0 };

  for (const block of blocks) {
    const nextWidth =
      current.blocks.length === 0 ? block.width : current.width + gapX + block.width;
    if (current.blocks.length > 0 && nextWidth > targetWidth) {
      rows.push(current);
      current = { blocks: [], width: 0, height: 0 };
    }
    current.blocks.push(block);
    current.width =
      current.blocks.length === 1
        ? block.width
        : current.width + gapX + block.width;
    current.height = Math.max(current.height, block.height);
  }
  if (current.blocks.length > 0) rows.push(current);

  const positioned: Node[] = [];
  let cursorY = 0;

  for (const row of rows) {
    const offsetX = Math.max(0, (targetWidth - row.width) / 2);
    let cursorX = offsetX;
    for (const block of row.blocks) {
      positioned.push(...translateNodes(block.nodes, cursorX, cursorY));
      cursorX += block.width + gapX;
    }
    cursorY += row.height + gapY;
  }

  return positioned;
}

export function layoutIsolatedCourseGrid(
  courseNodes: Node[],
  options: { columns: number; categoryOrder?: GroupCategory[] } = { columns: 4 },
): LayoutBlock[] {
  const columns = Math.max(1, Math.min(5, options.columns));
  const order = options.categoryOrder ?? CATEGORY_ORDER;
  const byCategory = new Map<GroupCategory, Node[]>();

  for (const category of order) byCategory.set(category, []);
  for (const node of courseNodes) {
    const data = node.data as unknown as CourseNodeData;
    const category = (data.groupCategory || "other") as GroupCategory;
    if (!byCategory.has(category)) byCategory.set(category, []);
    byCategory.get(category)!.push(node);
  }

  const blocks: LayoutBlock[] = [];

  for (const category of order) {
    const items = byCategory.get(category) || [];
    if (items.length === 0) continue;

    const headerId = `section-header-${category}`;
    const headerWidth = Math.min(
      columns * COURSE_NODE_WIDTH + (columns - 1) * GRID_GAP_X,
      Math.max(COURSE_NODE_WIDTH, items.length * COURSE_NODE_WIDTH),
    );
    const header: Node = {
      id: headerId,
      type: "sectionHeaderNode",
      position: { x: 0, y: 0 },
      data: {
        id: headerId,
        code: category,
        title: CATEGORY_SECTION_LABELS[category],
        credits: null,
        groupCode: category,
        groupName: CATEGORY_SECTION_LABELS[category],
        groupCategory: category,
        nodeType: "informational",
        textKind: "informational",
        sourceText:
          "Courses in this section have no currently known course prerequisite or corequisite edge. They may still have catalog enrollment conditions.",
        sectionKind: "isolated",
      },
      style: { width: Math.max(280, headerWidth), height: SECTION_HEADER_HEIGHT },
      draggable: false,
      selectable: false,
    };

    const gridNodes: Node[] = [header];
    items.forEach((node, index) => {
      const col = index % columns;
      const row = Math.floor(index / columns);
      gridNodes.push({
        ...node,
        position: {
          x: col * (COURSE_NODE_WIDTH + GRID_GAP_X),
          y: SECTION_HEADER_HEIGHT + GRID_GAP_Y + row * (COURSE_NODE_HEIGHT + GRID_GAP_Y),
        },
      });
    });

    const { nodes, width, height } = normalizeBlockOrigin(gridNodes);
    blocks.push({ id: `isolated-${category}`, nodes, width, height });
  }

  return blocks;
}

export function layoutRequirementSwimlanes(
  courseNodes: Node[],
  options: { columns: number } = { columns: 4 },
): { nodes: Node[]; disclaimerId: string } {
  const columns = Math.max(1, Math.min(5, options.columns));
  const disclaimerId = "requirements-mode-disclaimer";
  const disclaimer: Node = {
    id: disclaimerId,
    type: "sectionHeaderNode",
    position: { x: 0, y: 0 },
    data: {
      id: disclaimerId,
      code: "note",
      title: "By Requirement view — placement is not a semester sequence",
      credits: null,
      groupCode: "other",
      groupName: "Note",
      groupCategory: "other",
      nodeType: "informational",
      textKind: "informational",
      sourceText:
        "Courses are grouped by requirement category for browsing. Vertical or left-to-right order does not imply when to take a course.",
      sectionKind: "disclaimer",
    },
    style: { width: 720, height: SECTION_HEADER_HEIGHT + 8 },
    draggable: false,
    selectable: false,
  };

  const laneBlocks: LayoutBlock[] = [];
  let y = SECTION_HEADER_HEIGHT + LAYOUT_GAP_Y;

  for (const category of CATEGORY_ORDER) {
    const items = courseNodes.filter(
      (node) => (node.data as unknown as CourseNodeData).groupCategory === category,
    );
    if (items.length === 0) continue;

    const headerId = `lane-header-${category}`;
    const header: Node = {
      id: headerId,
      type: "sectionHeaderNode",
      position: { x: 0, y: 0 },
      data: {
        id: headerId,
        code: category,
        title: CATEGORY_SECTION_LABELS[category],
        credits: null,
        groupCode: category,
        groupName: CATEGORY_SECTION_LABELS[category],
        groupCategory: category,
        nodeType: "informational",
        textKind: "informational",
        sectionKind: "swimlane",
      },
      style: { width: 320, height: SECTION_HEADER_HEIGHT },
      draggable: false,
      selectable: false,
    };

    const laneNodes: Node[] = [header];
    items.forEach((node, index) => {
      const col = index % columns;
      const row = Math.floor(index / columns);
      laneNodes.push({
        ...node,
        position: {
          x: col * (COURSE_NODE_WIDTH + GRID_GAP_X),
          y: SECTION_HEADER_HEIGHT + GRID_GAP_Y + row * (COURSE_NODE_HEIGHT + GRID_GAP_Y),
        },
      });
    });

    const { nodes, height } = normalizeBlockOrigin(laneNodes);
    laneBlocks.push({
      id: `lane-${category}`,
      nodes: translateNodes(nodes, 0, y),
      width: 0,
      height,
    });
    y += height + LAYOUT_GAP_Y;
  }

  return {
    nodes: [disclaimer, ...laneBlocks.flatMap((block) => block.nodes)],
    disclaimerId,
  };
}

/** True when two axis-aligned bounds overlap (inclusive edges count as overlap). */
export function boundsOverlap(a: LayoutBounds, b: LayoutBounds, epsilon = 0.5): boolean {
  return !(
    a.maxX <= b.minX + epsilon ||
    b.maxX <= a.minX + epsilon ||
    a.maxY <= b.minY + epsilon ||
    b.maxY <= a.minY + epsilon
  );
}

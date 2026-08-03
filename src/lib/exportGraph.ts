import type { Edge, Node } from "@xyflow/react";
import { CourseNodeData, PrerequisiteEdgeData } from "@/types/program";
import { CATEGORY_PALETTES, getVisibleGraphBounds, COURSE_NODE_HEIGHT, COURSE_NODE_WIDTH } from "@/lib/graphLayout";

export interface ExportGraphOptions {
  programTitle: string;
  catalogYear: string;
  sourceName: string;
  /** @deprecated Prefer laidOutNodes from the packed React Flow layout. */
  nodes?: CourseNodeData[];
  /** @deprecated Prefer laidOutEdges. */
  edges?: PrerequisiteEdgeData[];
  laidOutNodes?: Node[];
  laidOutEdges?: Edge[];
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function nodeDimensions(node: Node): { width: number; height: number } {
  const width = typeof node.style?.width === "number" ? node.style.width : COURSE_NODE_WIDTH;
  const height = typeof node.style?.height === "number" ? node.style.height : COURSE_NODE_HEIGHT;
  return { width, height };
}

function renderLaidOutSvg(options: ExportGraphOptions & { laidOutNodes: Node[]; laidOutEdges: Edge[] }): string {
  const { programTitle, catalogYear, sourceName, laidOutNodes, laidOutEdges } = options;
  const bounds = getVisibleGraphBounds(laidOutNodes, 48);
  const headerHeight = 100;
  const footerHeight = 60;
  const width = Math.max(800, Math.ceil(bounds.width));
  const height = Math.max(600, Math.ceil(bounds.height + headerHeight + footerHeight));

  const nodeCenters = new Map<string, { x: number; y: number }>();
  for (const node of laidOutNodes) {
    const { width: w, height: h } = nodeDimensions(node);
    nodeCenters.set(node.id, {
      x: node.position.x - bounds.minX + w / 2,
      y: node.position.y - bounds.minY + headerHeight + h / 2,
    });
  }

  const edgesSvg = laidOutEdges
    .filter((edge) => nodeCenters.has(edge.source) && nodeCenters.has(edge.target))
    .map((edge) => {
      const from = nodeCenters.get(edge.source)!;
      const to = nodeCenters.get(edge.target)!;
      const stroke = (edge.style?.stroke as string) || "#747683";
      const dash = (edge.style?.strokeDasharray as string) || undefined;
      const midX = (from.x + to.x) / 2;
      return `<path d="M ${from.x} ${from.y} C ${midX} ${from.y}, ${midX} ${to.y}, ${to.x} ${to.y}" fill="none" stroke="${stroke}" stroke-width="2" ${dash ? `stroke-dasharray="${dash}"` : ""} marker-end="url(#arrow)" />`;
    })
    .join("\n");

  const nodesSvg = laidOutNodes
    .map((node) => {
      const data = node.data as unknown as CourseNodeData & {
        title?: string;
        sectionKind?: string;
        palette?: { bg: string; border: string; codeColor: string; badgeBg: string };
      };
      const { width: w, height: h } = nodeDimensions(node);
      const x = node.position.x - bounds.minX;
      const y = node.position.y - bounds.minY + headerHeight;

      if (node.type === "sectionHeaderNode") {
        return `
      <g transform="translate(${x}, ${y})">
        <text x="0" y="22" font-family="system-ui, sans-serif" font-size="14" font-weight="700" fill="#1b1c1c">${escapeXml(data.title || "")}</text>
      </g>`;
      }

      if (node.type === "requirementRuleNode") {
        return `
      <g transform="translate(${x}, ${y})">
        <rect width="${w}" height="${h}" rx="8" fill="#f8fafc" stroke="#747683" stroke-width="1.5" stroke-dasharray="4,3" />
        <text x="12" y="28" font-family="system-ui, sans-serif" font-size="13" font-weight="700" fill="#1b1c1c">${escapeXml(data.title || "Requirement")}</text>
      </g>`;
      }

      const palette = data.palette || CATEGORY_PALETTES[data.groupCategory] || CATEGORY_PALETTES.other;
      const title = (data.title || "").substring(0, 32);
      return `
      <g transform="translate(${x}, ${y})">
        <rect width="${w}" height="${h}" rx="8" fill="${palette.bg}" stroke="${palette.border}" stroke-width="2" />
        <text x="12" y="28" font-family="ui-monospace, monospace" font-size="13" font-weight="800" fill="${palette.codeColor}">${escapeXml(data.code || "")}</text>
        <text x="12" y="52" font-family="system-ui, sans-serif" font-size="11" font-weight="600" fill="#1b1c1c">${escapeXml(title)}</text>
        <rect x="${w - 52}" y="10" width="40" height="18" rx="9" fill="${palette.badgeBg}" />
        <text x="${w - 32}" y="23" font-family="system-ui, sans-serif" font-size="10" font-weight="700" fill="#ffffff" text-anchor="middle">${data.credits ?? "?"} cr</text>
      </g>`;
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <marker id="arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
      <path d="M0,0 L6,3 L0,6 Z" fill="#747683" />
    </marker>
  </defs>
  <style>
    .title { font-family: system-ui, sans-serif; font-size: 24px; font-weight: 800; fill: #001d59; }
    .subtitle { font-family: system-ui, sans-serif; font-size: 14px; fill: #444652; }
    .disclaimer { font-family: system-ui, sans-serif; font-size: 11px; fill: #747683; }
  </style>
  <rect width="100%" height="100%" fill="#fbf9f8" />
  <text x="48" y="40" class="title">SNHU Degree Map: ${escapeXml(programTitle)}</text>
  <text x="48" y="65" class="subtitle">Catalog Year: ${escapeXml(catalogYear)} | Source: ${escapeXml(sourceName)}</text>
  <line x1="48" y1="82" x2="${width - 48}" y2="82" stroke="#c4c6d4" stroke-width="1" />
  ${edgesSvg}
  ${nodesSvg}
  <line x1="48" y1="${height - 40}" x2="${width - 48}" y2="${height - 40}" stroke="#c4c6d4" stroke-width="1" />
  <text x="48" y="${height - 18}" class="disclaimer">Unofficial Tool. SNHU Degree Map is not affiliated with, endorsed by, or sponsored by Southern New Hampshire University.</text>
</svg>`;
}

/**
 * Generates an SVG of the packed degree-map layout (components + isolated grids).
 * Falls back to a simple card grid only when laid-out nodes are not provided.
 */
export function generateGraphSvgString(options: ExportGraphOptions): string {
  if (options.laidOutNodes && options.laidOutNodes.length > 0) {
    return renderLaidOutSvg({
      ...options,
      laidOutNodes: options.laidOutNodes,
      laidOutEdges: options.laidOutEdges || [],
    });
  }

  const { programTitle, catalogYear, sourceName, nodes = [] } = options;
  const width = 1200;
  const height = Math.max(800, nodes.length * 45 + 200);

  const nodesSvg = nodes
    .map((node, index) => {
      const col = index % 4;
      const row = Math.floor(index / 4);
      const x = 50 + col * 270;
      const y = 140 + row * 110;
      return `
      <g transform="translate(${x}, ${y})">
        <rect width="240" height="80" rx="8" fill="#f0eded" stroke="#003087" stroke-width="2" />
        <text x="15" y="30" font-family="sans-serif" font-size="14" font-weight="bold" fill="#001d59">${escapeXml(node.code)}</text>
        <text x="15" y="55" font-family="sans-serif" font-size="11" fill="#444652">${escapeXml(node.title.substring(0, 32))}</text>
        <rect x="180" y="12" width="45" height="20" rx="10" fill="#003087" />
        <text x="202" y="26" font-family="sans-serif" font-size="10" font-weight="bold" fill="#ffffff" text-anchor="middle">${node.credits} cr</text>
      </g>
    `;
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
  <style>
    .title { font-family: system-ui, sans-serif; font-size: 24px; font-weight: 800; fill: #001d59; }
    .subtitle { font-family: system-ui, sans-serif; font-size: 14px; fill: #444652; }
    .disclaimer { font-family: system-ui, sans-serif; font-size: 11px; fill: #747683; }
  </style>
  <rect width="100%" height="100%" fill="#fbf9f8" />
  <text x="50" y="45" class="title">SNHU Degree Map: ${escapeXml(programTitle)}</text>
  <text x="50" y="70" class="subtitle">Catalog Year: ${escapeXml(catalogYear)} | Source: ${escapeXml(sourceName)}</text>
  <line x1="50" y1="90" x2="${width - 50}" y2="90" stroke="#c4c6d4" stroke-width="1" />
  ${nodesSvg}
  <line x1="50" y1="${height - 50}" x2="${width - 50}" y2="${height - 50}" stroke="#c4c6d4" stroke-width="1" />
  <text x="50" y="${height - 25}" class="disclaimer">Unofficial Tool. SNHU Degree Map is not affiliated with, endorsed by, or sponsored by Southern New Hampshire University.</text>
</svg>`;
}

export function downloadGraphSvg(options: ExportGraphOptions): void {
  const svgString = generateGraphSvgString(options);
  const blob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = `${options.programTitle.toLowerCase().replace(/[^a-z0-9]/g, "-")}-degree-map.svg`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

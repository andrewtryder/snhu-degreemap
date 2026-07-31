import { CourseNodeData, PrerequisiteEdgeData } from "@/types/program";

export interface ExportGraphOptions {
  programTitle: string;
  catalogYear: string;
  sourceName: string;
  nodes: CourseNodeData[];
  edges: PrerequisiteEdgeData[];
}

export function generateGraphSvgString(options: ExportGraphOptions): string {
  const { programTitle, catalogYear, sourceName, nodes } = options;

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
        <text x="15" y="30" font-family="sans-serif" font-size="14" font-weight="bold" fill="#001d59">${node.code}</text>
        <text x="15" y="55" font-family="sans-serif" font-size="11" fill="#444652">${node.title.substring(0, 32)}</text>
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

  <!-- Header Section -->
  <rect width="100%" height="100%" fill="#fbf9f8" />
  <text x="50" y="45" class="title">SNHU Degree Map: ${programTitle}</text>
  <text x="50" y="70" class="subtitle">Catalog Year: ${catalogYear} | Source: ${sourceName}</text>
  <line x1="50" y1="90" x2="${width - 50}" y2="90" stroke="#c4c6d4" stroke-width="1" />

  <!-- Graph Nodes -->
  ${nodesSvg}

  <!-- Footer Disclaimer -->
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

export function triggerPrintDegreeMap(options: ExportGraphOptions): void {
  const printWindow = window.open("", "_blank");
  if (!printWindow) return;

  const svgContent = generateGraphSvgString(options);

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>${options.programTitle} - Degree Map Print</title>
        <style>
          body { margin: 0; padding: 20px; font-family: system-ui, sans-serif; background: white; }
          @media print {
            body { padding: 0; }
          }
        </style>
      </head>
      <body>
        ${svgContent}
        <script>
          window.onload = function() { window.print(); };
        </script>
      </body>
    </html>
  `);
  printWindow.document.close();
}

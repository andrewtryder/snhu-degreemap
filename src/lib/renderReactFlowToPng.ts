import { getNodesBounds, getViewportForBounds, type Node } from "@xyflow/react";

export interface RenderReactFlowToPngOptions {
  /** Nodes currently rendered in the React Flow instance (with measured dimensions). */
  nodes: Node[];
  /** Root element that contains `.react-flow__viewport` (the graph section). */
  flowElement: HTMLElement;
  backgroundColor?: string;
  minWidth?: number;
  maxWidth?: number;
  minHeight?: number;
  maxHeight?: number;
  padding?: number;
}

export interface RenderReactFlowToPngResult {
  dataUrl: string;
  width: number;
  height: number;
  pixelRatio: number;
}

const DEFAULT_MIN_WIDTH = 1200;
const DEFAULT_MAX_WIDTH = 4000;
const DEFAULT_MIN_HEIGHT = 800;
const DEFAULT_MAX_HEIGHT = 6000;
const DEFAULT_PADDING = 48;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/**
 * Exclude React Flow chrome and app overlays from the captured image.
 */
export function shouldExcludeFromGraphExport(node: HTMLElement): boolean {
  if (
    node.classList?.contains("react-flow__controls") ||
    node.classList?.contains("react-flow__attribution") ||
    node.classList?.contains("react-flow__panel") ||
    node.classList?.contains("react-flow__minimap") ||
    node.hasAttribute?.("data-export-exclude")
  ) {
    return true;
  }
  return false;
}

/**
 * Capture the complete laid-out React Flow graph as a PNG data URL.
 * Uses getNodesBounds + getViewportForBounds so the image includes all nodes,
 * not only the current viewport crop.
 */
export async function renderReactFlowToPng(
  options: RenderReactFlowToPngOptions,
): Promise<RenderReactFlowToPngResult> {
  const {
    nodes,
    flowElement,
    backgroundColor = "#ffffff",
    minWidth = DEFAULT_MIN_WIDTH,
    maxWidth = DEFAULT_MAX_WIDTH,
    minHeight = DEFAULT_MIN_HEIGHT,
    maxHeight = DEFAULT_MAX_HEIGHT,
    padding = DEFAULT_PADDING,
  } = options;

  if (!nodes.length) {
    throw new Error("Cannot export an empty degree map graph.");
  }

  const viewport = flowElement.querySelector(".react-flow__viewport") as HTMLElement | null;
  if (!viewport) {
    throw new Error("React Flow viewport element was not found for image export.");
  }

  const bounds = getNodesBounds(nodes);
  const paddedWidth = Math.ceil(bounds.width + padding * 2);
  const paddedHeight = Math.ceil(bounds.height + padding * 2);

  // Scale down proportionally when bounds exceed safe canvas limits (never crop).
  const widthScale = paddedWidth > maxWidth ? maxWidth / paddedWidth : 1;
  const heightScale = paddedHeight > maxHeight ? maxHeight / paddedHeight : 1;
  const scale = Math.min(widthScale, heightScale, 1);

  const imageWidth = clamp(Math.ceil(paddedWidth * scale), minWidth, maxWidth);
  const imageHeight = clamp(Math.ceil(paddedHeight * scale), minHeight, maxHeight);

  const viewportTransform = getViewportForBounds(bounds, imageWidth, imageHeight, 0.1, 2, padding / imageWidth);

  // Prefer pixelRatio 2; fall back for very large outputs to stay within canvas limits.
  const area = imageWidth * imageHeight;
  const pixelRatio = area > 12_000_000 ? 1 : 2;

  // Load html-to-image only when the user starts PNG generation.
  const { toPng } = await import("html-to-image");

  const dataUrl = await toPng(viewport, {
    backgroundColor,
    width: imageWidth,
    height: imageHeight,
    pixelRatio,
    style: {
      width: `${imageWidth}px`,
      height: `${imageHeight}px`,
      transform: `translate(${viewportTransform.x}px, ${viewportTransform.y}px) scale(${viewportTransform.zoom})`,
    },
    filter: (node) => {
      if (!(node instanceof HTMLElement)) return true;
      return !shouldExcludeFromGraphExport(node);
    },
  });

  return { dataUrl, width: imageWidth, height: imageHeight, pixelRatio };
}

export function normalizeProgramTitleForFilename(programTitle: string): string {
  return programTitle
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function downloadPngDataUrl(dataUrl: string, programTitle: string): void {
  const link = document.createElement("a");
  link.href = dataUrl;
  link.download = `${normalizeProgramTitleForFilename(programTitle)}-degree-map.png`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Print a generated PNG via a hidden iframe (fresh user gesture required).
 */
export function printPngImage(options: {
  dataUrl: string;
  programTitle: string;
  catalogYear?: string;
}): void {
  const { dataUrl, programTitle, catalogYear } = options;
  const iframe = document.createElement("iframe");
  iframe.setAttribute("aria-hidden", "true");
  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "0";
  document.body.appendChild(iframe);

  const doc = iframe.contentDocument || iframe.contentWindow?.document;
  if (!doc) {
    document.body.removeChild(iframe);
    throw new Error("Unable to open a printable document for the graph image.");
  }

  const yearLine = catalogYear ? `<p style="margin:0 0 12px;font:14px system-ui,sans-serif;color:#444;">Catalog Year: ${catalogYear}</p>` : "";

  doc.open();
  doc.write(`<!DOCTYPE html>
<html>
  <head>
    <title>${programTitle} — Degree Map</title>
    <style>
      @page { size: landscape; margin: 0.4in; }
      html, body { margin: 0; padding: 0; background: #fff; color: #111; }
      body { padding: 16px; font-family: system-ui, sans-serif; }
      h1 { font-size: 18px; margin: 0 0 8px; }
      img { max-width: 100%; height: auto; display: block; }
    </style>
  </head>
  <body>
    <h1>${programTitle}</h1>
    ${yearLine}
    <img id="graph-image" src="${dataUrl}" alt="Degree map for ${programTitle}" />
  </body>
</html>`);
  doc.close();

  const img = doc.getElementById("graph-image") as HTMLImageElement | null;
  const cleanup = () => {
    setTimeout(() => {
      if (iframe.parentNode) document.body.removeChild(iframe);
    }, 1000);
  };

  const triggerPrint = () => {
    try {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    } finally {
      cleanup();
    }
  };

  if (img) {
    if (img.complete) {
      triggerPrint();
    } else {
      img.onload = triggerPrint;
      img.onerror = () => {
        cleanup();
        throw new Error("Graph image failed to load for printing.");
      };
    }
  } else {
    triggerPrint();
  }
}

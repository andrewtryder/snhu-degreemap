import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  normalizeProgramTitleForFilename,
  shouldExcludeFromGraphExport,
  downloadPngDataUrl,
} from "@/lib/renderReactFlowToPng";

describe("renderReactFlowToPng helpers", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("normalizes download filenames", () => {
    expect(normalizeProgramTitleForFilename("Computer Science")).toBe("computer-science");
    expect(normalizeProgramTitleForFilename("  BS: Accounting! ")).toBe("bs-accounting");
  });

  it("excludes React Flow controls and attribution from capture", () => {
    const controls = document.createElement("div");
    controls.className = "react-flow__controls";
    expect(shouldExcludeFromGraphExport(controls)).toBe(true);

    const attribution = document.createElement("div");
    attribution.className = "react-flow__attribution";
    expect(shouldExcludeFromGraphExport(attribution)).toBe(true);

    const excluded = document.createElement("div");
    excluded.setAttribute("data-export-exclude", "true");
    expect(shouldExcludeFromGraphExport(excluded)).toBe(true);

    const node = document.createElement("div");
    node.className = "react-flow__node";
    expect(shouldExcludeFromGraphExport(node)).toBe(false);
  });

  it("downloads PNG with expected filename", () => {
    const click = vi.fn();
    const appendChild = vi.spyOn(document.body, "appendChild").mockImplementation((node) => node);
    const removeChild = vi.spyOn(document.body, "removeChild").mockImplementation((node) => node);
    vi.spyOn(document, "createElement").mockImplementation(() => {
      return { click, href: "", download: "" } as unknown as HTMLAnchorElement;
    });

    downloadPngDataUrl("data:image/png;base64,abc", "Computer Science");

    expect(click).toHaveBeenCalled();
    const created = (document.createElement as unknown as ReturnType<typeof vi.fn>).mock.results[0]
      ?.value as HTMLAnchorElement;
    expect(created.download).toBe("computer-science-degree-map.png");
    expect(created.href).toBe("data:image/png;base64,abc");

    appendChild.mockRestore();
    removeChild.mockRestore();
  });
});

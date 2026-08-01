"use client";

import React, { useState, useMemo, useCallback, useRef } from "react";
import {
  ReactFlow,
  ReactFlowProvider,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  useReactFlow,
  type Node,
  type Edge,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { CourseNodeData, PrerequisiteEdgeData, GroupCategory } from "@/types/program";
import { layoutDegreeGraph } from "@/lib/graphLayout";
import { buildDegreeGraph } from "@/lib/graphTransformer";
import { downloadGraphSvg } from "@/lib/exportGraph";
import { renderReactFlowToPng } from "@/lib/renderReactFlowToPng";
import { CustomCourseNode } from "./CustomCourseNode";
import { RequirementRuleNode } from "./RequirementRuleNode";
import { InformationalNode } from "./InformationalNode";
import { CourseDetailDrawer } from "./CourseDetailDrawer";
import { GraphImagePreviewDialog } from "./GraphImagePreviewDialog";
import { Button } from "@/components/ui/Button";
import {
  FilterIcon,
  DownloadIcon,
  ListIcon,
  Maximize2Icon,
  Minimize2Icon,
  PrinterIcon,
  SparklesIcon,
  ZapIcon,
} from "lucide-react";

const nodeTypes = {
  courseNode: CustomCourseNode,
  requirementRuleNode: RequirementRuleNode,
  informationalNode: InformationalNode,
};

export interface DegreeMapGraphProps {
  nodesData: CourseNodeData[];
  edgesData: PrerequisiteEdgeData[];
  programTitle: string;
  catalogYear?: string;
  sourceName?: string;
  onToggleListView?: () => void;
  className?: string;
}

function DegreeMapGraphInner({
  nodesData,
  edgesData,
  programTitle,
  catalogYear = "2025-2026",
  sourceName = "SNHU Academic Catalog",
  onToggleListView,
  className = "h-[650px]",
}: DegreeMapGraphProps) {
  const [selectedGroup, setSelectedGroup] = useState<GroupCategory | "all">("all");
  const [selectedCourse, setSelectedCourse] = useState<CourseNodeData | null>(null);
  const [isFullScreen, setIsFullScreen] = useState<boolean>(false);
  const [highlightMode, setHighlightMode] = useState<"none" | "starting" | "critical">("none");
  const [isExporting, setIsExporting] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewDataUrl, setPreviewDataUrl] = useState<string | null>(null);
  const [previewWidth, setPreviewWidth] = useState<number | undefined>();
  const [previewHeight, setPreviewHeight] = useState<number | undefined>();
  const [previewError, setPreviewError] = useState<string | null>(null);

  const flowContainerRef = useRef<HTMLElement | null>(null);
  const { getNodes } = useReactFlow();

  const fullGraph = useMemo(() => buildDegreeGraph(nodesData, edgesData), [nodesData, edgesData]);

  const { nodes: initialNodes, edges: initialEdges } = useMemo(
    () => layoutDegreeGraph(fullGraph.nodes, fullGraph.edges),
    [fullGraph],
  );

  const [nodes, , onNodesChange] = useNodesState<Node>(initialNodes);
  const [edges, , onEdgesChange] = useEdgesState<Edge>(initialEdges);

  const startingSet = useMemo(() => new Set(fullGraph.insights.startingCourses), [fullGraph]);
  const criticalSet = useMemo(() => new Set(fullGraph.insights.criticalCourses), [fullGraph]);

  const processedNodes = useMemo(() => {
    return nodes.map((node) => {
      const course = node.data as unknown as CourseNodeData;
      if (
        (course as unknown as { nodeType?: string }).nodeType &&
        (course as unknown as { nodeType?: string }).nodeType !== "course" &&
        (course as unknown as { nodeType?: string }).nodeType !== "elective_placeholder"
      ) {
        return node;
      }

      const matchesGroup = selectedGroup === "all" || course.groupCategory === selectedGroup;

      let isHighlighted = false;
      if (highlightMode === "starting" && startingSet.has(course.code)) {
        isHighlighted = true;
      } else if (highlightMode === "critical" && criticalSet.has(course.code)) {
        isHighlighted = true;
      }

      const isFilteredOut =
        !matchesGroup ||
        (highlightMode === "starting" && !startingSet.has(course.code)) ||
        (highlightMode === "critical" && !criticalSet.has(course.code));

      return {
        ...node,
        data: {
          ...node.data,
          isHighlighted,
          isFilteredOut,
        },
      };
    });
  }, [nodes, selectedGroup, highlightMode, startingSet, criticalSet]);

  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      const course = nodesData.find((c) => c.id === node.id);
      if (course) {
        setSelectedCourse(course);
      }
    },
    [nodesData],
  );

  const handleExportSvg = () => {
    downloadGraphSvg({
      programTitle,
      catalogYear,
      sourceName,
      nodes: fullGraph.nodes,
      edges: fullGraph.edges,
    });
  };

  const handlePrintPreview = async () => {
    if (isExporting) return;

    setIsExporting(true);
    setPreviewOpen(true);
    setPreviewDataUrl(null);
    setPreviewError(null);
    setPreviewWidth(undefined);
    setPreviewHeight(undefined);

    try {
      const flowElement = flowContainerRef.current;
      if (!flowElement) {
        throw new Error("Graph container is not ready for export.");
      }

      const result = await renderReactFlowToPng({
        nodes: getNodes(),
        flowElement,
        backgroundColor: "#ffffff",
      });

      setPreviewDataUrl(result.dataUrl);
      setPreviewWidth(result.width);
      setPreviewHeight(result.height);
    } catch (err) {
      console.error("Graph image export failed", err instanceof Error ? err.message : "unknown error");
      setPreviewError("Unable to render the degree map image. Try again or use SVG download.");
    } finally {
      setIsExporting(false);
    }
  };

  const closePreview = () => {
    setPreviewOpen(false);
    setPreviewDataUrl(null);
    setPreviewError(null);
    setIsExporting(false);
  };

  const containerClass = isFullScreen
    ? "fixed inset-0 z-50 flex flex-col bg-background p-4 sm:p-6"
    : "flex flex-col gap-3";

  const graphHeightClass = isFullScreen ? "flex-1 h-full min-h-[500px]" : className;

  return (
    <div className={containerClass}>
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-surface-variant bg-surface-container-low p-3 shadow-xs">
        <div className="flex flex-1 flex-wrap items-center gap-2 min-w-[200px]">
          <div className="flex items-center gap-1.5 overflow-x-auto py-1">
            <span className="text-xs font-semibold text-on-surface-variant flex items-center gap-1">
              <FilterIcon className="h-3.5 w-3.5" /> Group:
            </span>
            <button
              type="button"
              onClick={() => setSelectedGroup("all")}
              className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
                selectedGroup === "all"
                  ? "bg-primary text-on-primary"
                  : "bg-surface-container text-on-surface-variant hover:bg-surface-container-high"
              }`}
            >
              All
            </button>
            <button
              type="button"
              onClick={() => setSelectedGroup("gened")}
              className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
                selectedGroup === "gened"
                  ? "bg-[#003087] text-white"
                  : "bg-[#dbe1ff] text-[#001d59] hover:opacity-80"
              }`}
            >
              GenEd
            </button>
            <button
              type="button"
              onClick={() => setSelectedGroup("core")}
              className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
                selectedGroup === "core"
                  ? "bg-[#004112] text-white"
                  : "bg-[#e8f5e9] text-[#002908] hover:opacity-80"
              }`}
            >
              Core
            </button>
            <button
              type="button"
              onClick={() => setSelectedGroup("major")}
              className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
                selectedGroup === "major"
                  ? "bg-[#7e22ce] text-white"
                  : "bg-[#f3e8ff] text-[#581c87] hover:opacity-80"
              }`}
            >
              Major
            </button>
            <button
              type="button"
              onClick={() => setSelectedGroup("elective")}
              className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
                selectedGroup === "elective"
                  ? "bg-[#d97706] text-white"
                  : "bg-[#fef3c7] text-[#78350f] hover:opacity-80"
              }`}
            >
              Electives
            </button>
          </div>

          <div className="flex items-center gap-1 border-l border-outline-variant pl-2">
            <button
              type="button"
              onClick={() => setHighlightMode(highlightMode === "starting" ? "none" : "starting")}
              className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium transition-colors ${
                highlightMode === "starting"
                  ? "bg-tertiary text-on-tertiary"
                  : "bg-surface-container text-on-surface-variant hover:bg-surface-container-high"
              }`}
              title="Highlight starting courses with zero prerequisites"
            >
              <SparklesIcon className="h-3 w-3" /> Starting ({fullGraph.insights.startingCourses.length})
            </button>
            <button
              type="button"
              onClick={() => setHighlightMode(highlightMode === "critical" ? "none" : "critical")}
              className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium transition-colors ${
                highlightMode === "critical"
                  ? "bg-secondary text-on-secondary"
                  : "bg-surface-container text-on-surface-variant hover:bg-surface-container-high"
              }`}
              title="Highlight critical path courses with multiple downstream dependencies"
            >
              <ZapIcon className="h-3 w-3" /> Critical ({fullGraph.insights.criticalCourses.length})
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onToggleListView && !isFullScreen && (
            <Button variant="outline" size="sm" onClick={onToggleListView}>
              <ListIcon className="mr-1.5 h-4 w-4" /> Requirements List
            </Button>
          )}

          <Button variant="outline" size="sm" onClick={handleExportSvg} title="Download SVG Graph">
            <DownloadIcon className="h-4 w-4 mr-1" /> SVG
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handlePrintPreview}
            disabled={isExporting}
            title="Preview and print degree map image"
            aria-label="Preview and print degree map image"
          >
            <PrinterIcon className="h-4 w-4" />
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsFullScreen(!isFullScreen)}
            title={isFullScreen ? "Exit Full Screen" : "Full Screen Mode"}
          >
            {isFullScreen ? <Minimize2Icon className="h-4 w-4" /> : <Maximize2Icon className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      <section
        ref={flowContainerRef}
        role="region"
        aria-label={`Interactive prerequisite graph for ${programTitle}`}
        className={`relative overflow-hidden rounded-xl border border-surface-variant bg-surface-container-lowest shadow-sm ${graphHeightClass}`}
      >
        <ReactFlow
          nodes={processedNodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          nodeTypes={nodeTypes}
          onNodeClick={onNodeClick}
          nodesDraggable={false}
          fitView
          fitViewOptions={{ padding: 0.25 }}
          attributionPosition="bottom-right"
          className="bg-surface-container-lowest"
        >
          <Background color="#e4e2e1" gap={20} size={1} />
          <Controls className="!border-surface-variant !bg-surface-container-lowest !shadow-md" />
        </ReactFlow>

        <div
          data-export-exclude="true"
          className="pointer-events-none absolute bottom-4 left-4 z-10 flex flex-col gap-1.5 rounded-lg border border-surface-variant bg-surface-container-lowest/90 p-3 shadow-md backdrop-blur-xs sm:flex-row sm:items-center sm:gap-4 text-xs"
        >
          <div className="flex items-center gap-3 font-medium">
            <span className="flex items-center gap-1">
              <span className="h-3 w-3 rounded-xs border border-[#003087] bg-[#dbe1ff]" /> GenEd
            </span>
            <span className="flex items-center gap-1">
              <span className="h-3 w-3 rounded-xs border border-[#004112] bg-[#e8f5e9]" /> Core
            </span>
            <span className="flex items-center gap-1">
              <span className="h-3 w-3 rounded-xs border border-[#7e22ce] bg-[#f3e8ff]" /> Major
            </span>
            <span className="flex items-center gap-1">
              <span className="h-3 w-3 rounded-xs border border-[#d97706] bg-[#fef3c7]" /> Elective
            </span>
          </div>
          <div className="h-3 w-px bg-outline-variant hidden sm:block" />
          <div className="flex items-center gap-3 text-[11px] text-on-surface-variant">
            <span className="flex items-center gap-1">
              <span className="h-0.5 w-4 bg-outline" /> Prerequisite
            </span>
            <span className="flex items-center gap-1">
              <span className="h-0.5 w-4 border-b-2 border-dashed border-[#2c6cf0]" /> Corequisite
            </span>
          </div>
        </div>
      </section>

      <CourseDetailDrawer course={selectedCourse} onClose={() => setSelectedCourse(null)} allCourses={nodesData} />

      <GraphImagePreviewDialog
        isOpen={previewOpen}
        onClose={closePreview}
        programTitle={programTitle}
        catalogYear={catalogYear}
        dataUrl={previewDataUrl}
        width={previewWidth}
        height={previewHeight}
        isLoading={isExporting}
        error={previewError}
      />
    </div>
  );
}

export function DegreeMapGraph(props: DegreeMapGraphProps) {
  return (
    <ReactFlowProvider>
      <DegreeMapGraphInner {...props} />
    </ReactFlowProvider>
  );
}

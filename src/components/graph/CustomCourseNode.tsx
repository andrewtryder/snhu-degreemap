"use client";

import React, { memo } from "react";
import { Handle, Position, NodeProps } from "@xyflow/react";
import { CourseNodeData } from "@/types/program";
import { CategoryPalette } from "@/lib/graphLayout";

interface CustomCourseNodeData extends CourseNodeData {
  palette: CategoryPalette;
  isHighlighted?: boolean;
  isFilteredOut?: boolean;
}

export const CustomCourseNode = memo(({ data }: NodeProps & { data: CustomCourseNodeData }) => {
  const { code, title, credits, palette, isPlaceholder, isExternal, resolutionStatus, isHighlighted, isFilteredOut } =
    data;

  const opacityClass = isFilteredOut ? "opacity-30 transition-opacity" : "opacity-100";
  const highlightClass = isHighlighted
    ? "ring-4 ring-primary ring-offset-2 scale-105 transition-transform"
    : "";

  return (
    <div
      className={`group relative flex h-[80px] w-[180px] flex-col justify-between rounded-lg border-2 p-2.5 shadow-sm transition-all hover:shadow-md ${opacityClass} ${highlightClass} ${isExternal ? "border-dashed" : ""}`}
      style={{
        backgroundColor: palette.bg,
        borderColor: palette.border,
      }}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="!h-2.5 !w-2.5 !border-2 !border-white !bg-outline"
      />

      <div className="flex items-center justify-between gap-1">
        <div className="flex items-center gap-1">
          <span
            className="font-mono text-xs font-extrabold tracking-wide"
            style={{ color: palette.codeColor }}
          >
            {code}
          </span>
          {isExternal && <span className="text-[9px] font-semibold text-on-surface-variant">External</span>}
        </div>
        <span
          className="rounded-full px-1.5 py-0.2 text-[10px] font-semibold text-white"
          style={{ backgroundColor: palette.badgeBg }}
        >
          {credits} cr
        </span>
      </div>

      <div
        className="line-clamp-2 text-xs font-semibold leading-tight text-on-surface"
        title={title}
      >
        {isPlaceholder ? (
          <span className="italic text-on-surface-variant font-normal">{title}</span>
        ) : (
          title
        )}
      </div>

      {resolutionStatus && resolutionStatus !== "resolved" && !isExternal && (
        <span className="text-[9px] font-medium text-amber-800">Details unavailable</span>
      )}

      <Handle
        type="source"
        position={Position.Bottom}
        className="!h-2.5 !w-2.5 !border-2 !border-white !bg-outline"
      />
    </div>
  );
});

CustomCourseNode.displayName = "CustomCourseNode";

"use client";

import React, { memo, useState } from "react";
import { type NodeProps } from "@xyflow/react";
import { DegreeGraphNodeData } from "@/types/degreeGraph";

export const InformationalNode = memo(({ data }: NodeProps & { data: DegreeGraphNodeData }) => {
  const [expanded, setExpanded] = useState(false);
  const text = data.sourceText || data.title;
  const compact = text.length > 170 ? `${text.slice(0, 167)}…` : text;

  return (
    <div className="w-[260px] rounded-lg border border-outline-variant bg-surface-container-low p-3 shadow-sm">
      <p className="text-[10px] font-bold uppercase tracking-wide text-on-surface-variant">
        {data.textKind === "policy" ? "Policy note" : data.textKind === "unparsed" ? "Catalog note" : "Information"}
      </p>
      <p className="mt-1 text-xs leading-relaxed text-on-surface">{expanded ? text : compact}</p>
      {text.length > 170 && (
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="mt-2 text-xs font-semibold text-primary underline"
        >
          {expanded ? "Hide details" : "View details"}
        </button>
      )}
    </div>
  );
});

InformationalNode.displayName = "InformationalNode";

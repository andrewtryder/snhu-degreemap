"use client";

import React, { memo, useState } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { DegreeGraphNodeData } from "@/types/degreeGraph";

export const RequirementRuleNode = memo(({ data }: NodeProps & { data: DegreeGraphNodeData }) => {
  const [expanded, setExpanded] = useState(false);
  const rule = data.ruleMetadata || {};
  const summary = [
    rule.minimumCredits && `Complete ${rule.minimumCredits} credits`,
    rule.minimumSelections && `Choose ${rule.minimumSelections}`,
    rule.eligibleSubjectCodes?.length && rule.eligibleSubjectCodes.join("/") + " electives",
    rule.minimumCourseLevel && rule.maximumCourseLevel && `Courses numbered ${rule.minimumCourseLevel}–${rule.maximumCourseLevel}`,
    rule.explicitCourseCodes?.length && `Options: ${rule.explicitCourseCodes.join(", ")}`,
  ].filter(Boolean);

  return (
    <div className="w-[300px] rounded-lg border-2 border-dashed bg-surface-container-lowest p-3 shadow-sm" style={{ borderColor: data.groupCategory === "elective" ? "#d97706" : "#747683" }}>
      <Handle type="source" position={Position.Bottom} className="!h-2 !w-2 !bg-outline" />
      <p className="text-[10px] font-bold uppercase tracking-wide text-on-surface-variant">Requirement rule</p>
      <h3 className="mt-1 text-sm font-bold text-on-surface">{data.title}</h3>
      <ul className="mt-2 space-y-0.5 text-[11px] text-on-surface-variant">
        {summary.slice(0, expanded ? undefined : 3).map((line) => <li key={line}>• {line}</li>)}
      </ul>
      {data.sourceText && (
        <>
          <button type="button" onClick={() => setExpanded(!expanded)} className="mt-2 text-xs font-semibold text-primary underline">
            {expanded ? "Hide details" : "View details"}
          </button>
          {expanded && <p className="mt-2 whitespace-pre-wrap text-[11px] leading-relaxed text-on-surface-variant">{data.sourceText}</p>}
        </>
      )}
    </div>
  );
});

RequirementRuleNode.displayName = "RequirementRuleNode";

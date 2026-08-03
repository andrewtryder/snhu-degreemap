"use client";

import React, { memo } from "react";
import { NodeProps } from "@xyflow/react";

interface SectionHeaderNodeData {
  title: string;
  sourceText?: string;
  sectionKind?: "isolated" | "swimlane" | "disclaimer";
  groupCategory?: string;
}

export const SectionHeaderNode = memo(({ data, id }: NodeProps & { data: SectionHeaderNodeData }) => {
  const headingId = `section-heading-${id}`;
  const isDisclaimer = data.sectionKind === "disclaimer";

  return (
    <div
      className={`flex w-full flex-col justify-center rounded-md px-3 py-2 ${
        isDisclaimer
          ? "border border-dashed border-outline-variant bg-surface-container-low"
          : "border-b-2 border-outline-variant bg-transparent"
      }`}
      role="group"
      aria-labelledby={headingId}
    >
      <h3
        id={headingId}
        className={`text-sm font-bold tracking-tight text-on-surface ${isDisclaimer ? "" : "uppercase"}`}
      >
        {data.title}
      </h3>
      {data.sectionKind === "isolated" && data.sourceText && (
        <p className="mt-0.5 max-w-xl text-[11px] leading-snug text-on-surface-variant">{data.sourceText}</p>
      )}
      {isDisclaimer && data.sourceText && (
        <p className="mt-0.5 max-w-2xl text-[11px] leading-snug text-on-surface-variant">{data.sourceText}</p>
      )}
    </div>
  );
});

SectionHeaderNode.displayName = "SectionHeaderNode";

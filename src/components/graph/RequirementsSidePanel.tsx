"use client";

import React from "react";
import { RequirementGroup, RequirementItem } from "@/types/program";
import { getRequirementInstruction, hasActionableRequirements } from "@/components/programs/RequirementTree";
import { XIcon } from "lucide-react";

function collectCourseOptions(items: RequirementItem[]): string[] {
  const codes: string[] = [];
  for (const item of items) {
    if (item.courses?.length) codes.push(...item.courses);
    if (item.ruleMetadata?.explicitCourseCodes?.length) {
      codes.push(...item.ruleMetadata.explicitCourseCodes);
    }
    if (item.subItems?.length) codes.push(...collectCourseOptions(item.subItems));
  }
  return [...new Set(codes)];
}

function RequirementCard({
  group,
  selected,
  onSelect,
}: {
  group: RequirementGroup;
  selected: boolean;
  onSelect: (id: string | null) => void;
}) {
  const instruction = getRequirementInstruction(group);
  const courseOptions = collectCourseOptions(group.items);
  const policyNotes = [
    ...(group.ruleMetadata?.policyNotes || []),
    ...(group.sourceText ? [] : []),
  ];
  const hasPolicy = Boolean(group.sourceText) || policyNotes.length > 0;

  return (
    <button
      type="button"
      onClick={() => onSelect(selected ? null : group.id)}
      aria-pressed={selected}
      className={`w-full rounded-lg border p-3 text-left transition-colors ${
        selected
          ? "border-primary bg-primary/5 ring-2 ring-primary/30"
          : "border-surface-variant bg-surface-container-lowest hover:bg-surface-container-low"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-sm font-bold text-on-surface">{group.title}</h3>
        <span className="shrink-0 font-mono text-xs font-semibold text-primary">
          {group.totalCredits == null ? "Credits n/a" : `${group.totalCredits} cr`}
        </span>
      </div>
      {instruction && (
        <p className="mt-1 text-[11px] font-medium text-on-surface-variant">{instruction}</p>
      )}
      {courseOptions.length > 0 && (
        <p className="mt-2 text-[11px] leading-relaxed text-on-surface">
          <span className="font-semibold">Courses: </span>
          {courseOptions.slice(0, 12).join(", ")}
          {courseOptions.length > 12 ? ` (+${courseOptions.length - 12} more)` : ""}
        </p>
      )}
      {!hasActionableRequirements(group.items) && courseOptions.length === 0 && group.description && (
        <p className="mt-1 text-[11px] text-on-surface-variant">{group.description}</p>
      )}
      {hasPolicy && (
        <details
          className="mt-2 text-[11px] text-on-surface-variant"
          onClick={(event) => event.stopPropagation()}
        >
          <summary className="cursor-pointer font-semibold">Policy notes</summary>
          {policyNotes.map((note) => (
            <p key={note} className="mt-1 whitespace-pre-wrap leading-relaxed">
              {note}
            </p>
          ))}
          {group.sourceText && (
            <p className="mt-1 whitespace-pre-wrap leading-relaxed">{group.sourceText}</p>
          )}
        </details>
      )}
    </button>
  );
}

export interface RequirementsSidePanelProps {
  groups: RequirementGroup[];
  selectedRequirementId: string | null;
  onSelectRequirement: (id: string | null) => void;
  collapsed: boolean;
  onToggleCollapsed: () => void;
  variant: "desktop" | "mobile";
  requirementsHref?: string;
}

export function RequirementsSidePanel({
  groups,
  selectedRequirementId,
  onSelectRequirement,
  collapsed,
  onToggleCollapsed,
  variant,
  requirementsHref,
}: RequirementsSidePanelProps) {
  if (groups.length === 0) return null;

  const body = (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between gap-2 border-b border-surface-variant px-3 py-2">
        <h2 className="text-sm font-bold text-on-surface">Degree requirements</h2>
        <div className="flex items-center gap-2">
          {requirementsHref && (
            <a
              href={requirementsHref}
              className="text-[11px] font-semibold text-primary underline-offset-2 hover:underline"
            >
              Full list
            </a>
          )}
          <button
            type="button"
            onClick={onToggleCollapsed}
            className="rounded-md p-1 text-on-surface-variant hover:bg-surface-container"
            aria-label={collapsed ? "Expand requirements panel" : "Collapse requirements panel"}
          >
            <XIcon className="h-4 w-4" />
          </button>
        </div>
      </div>
      <p className="px-3 py-2 text-[11px] text-on-surface-variant">
        Select a requirement to highlight its courses on the map. Membership links appear only for the
        selected requirement.
      </p>
      <div className="flex-1 space-y-2 overflow-y-auto px-3 pb-3">
        {groups.map((group) => (
          <RequirementCard
            key={group.id}
            group={group}
            selected={selectedRequirementId === group.id}
            onSelect={onSelectRequirement}
          />
        ))}
      </div>
    </div>
  );

  if (variant === "mobile") {
    if (collapsed) {
      return (
        <div data-export-exclude="true" className="border-t border-surface-variant bg-surface-container-lowest p-2 lg:hidden">
          <button
            type="button"
            onClick={onToggleCollapsed}
            className="w-full rounded-md bg-surface-container px-3 py-2 text-sm font-semibold text-on-surface"
          >
            Show degree requirements
          </button>
        </div>
      );
    }
    return (
      <div
        data-export-exclude="true"
        className="max-h-[45vh] border-t border-surface-variant bg-surface-container-lowest shadow-lg lg:hidden"
        role="dialog"
        aria-label="Degree requirements"
      >
        {body}
      </div>
    );
  }

  if (collapsed) {
    return (
      <div data-export-exclude="true" className="hidden w-10 shrink-0 flex-col border-l border-surface-variant bg-surface-container-lowest lg:flex">
        <button
          type="button"
          onClick={onToggleCollapsed}
          className="h-full writing-mode-vertical rotate-180 px-1 text-xs font-semibold tracking-wide text-on-surface-variant"
          style={{ writingMode: "vertical-rl" }}
          aria-label="Expand requirements panel"
        >
          Requirements
        </button>
      </div>
    );
  }

  return (
    <aside
      data-export-exclude="true"
      className="hidden w-[320px] shrink-0 border-l border-surface-variant bg-surface-container-lowest lg:block"
      aria-label="Degree requirements panel"
    >
      {body}
    </aside>
  );
}

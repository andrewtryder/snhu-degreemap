import React from "react";
import { RequirementGroup, RequirementItem } from "@/types/program";

export function hasActionableRequirements(items: RequirementItem[]): boolean {
  return items.some((item) => {
    if (item.type === "group") return hasActionableRequirements(item.subItems || []);
    if (item.isUnparsed || item.id.startsWith("txt_") || /^n\/?a$/i.test(item.title.trim())) return false;
    return item.type === "single" || item.type === "choice" || item.type === "elective";
  });
}

export function getRequirementInstruction(
  group: Pick<RequirementGroup, "ruleType" | "minimumSelections" | "minimumCredits" | "items">,
): string | null {
  const actionable = hasActionableRequirements(group.items);

  switch (group.ruleType) {
    case "all_of":
      return actionable ? "Complete all of the following" : null;
    case "choose_n":
      return actionable && group.minimumSelections ? `Choose ${group.minimumSelections} of the following` : null;
    case "choose_credits":
      return actionable && group.minimumCredits ? `Complete at least ${group.minimumCredits} credits` : null;
    case "free_elective":
    case "elective":
      return actionable ? "Free electives" : null;
    default:
      return null;
  }
}

export function RequirementTreeItems({ items, depth = 0 }: { items: RequirementItem[]; depth?: number }) {
  if (items.length === 0) return null;

  return (
    <ul className={`space-y-2 ${depth > 0 ? "ml-3 border-l border-surface-variant pl-3" : ""}`}>
      {items.map((item) => {
        const isGroup = item.type === "group";
        return (
          <li key={item.id} className="rounded-md border border-surface-variant bg-surface-container-low p-3 text-xs">
            <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
              <div>
                <span className="font-bold text-on-surface">{item.title}</span>
                {item.description && (
                  <p className="mt-0.5 text-[11px] text-on-surface-variant">{item.description}</p>
                )}
                {isGroup && item.sourceText && (
                  <details className="mt-2 text-[11px] text-on-surface-variant">
                    <summary className="cursor-pointer font-semibold">Complete catalog rule text</summary>
                    <p className="mt-1 whitespace-pre-wrap leading-relaxed">{item.sourceText}</p>
                  </details>
                )}
              </div>
              <span className="shrink-0 font-mono font-semibold text-primary">
                {item.credits == null ? "Credits not specified" : `${item.credits} Credits`}
              </span>
            </div>
            {isGroup && <RequirementTreeItems items={item.subItems || []} depth={depth + 1} />}
          </li>
        );
      })}
    </ul>
  );
}

import { DEGREE_MAP_CANVAS_HEIGHT_CLASS } from "@/components/graph/graphShell";

/**
 * Reserves toolbar + canvas space so dynamically loading React Flow
 * does not shift content below the map.
 */
export function DegreeMapGraphLoadingFallback() {
  return (
    <div className="flex flex-col gap-3" role="status" aria-live="polite">
      <div
        className="h-14 rounded-lg border border-surface-variant bg-surface-container-low"
        aria-hidden="true"
      />
      <div
        className={`flex ${DEGREE_MAP_CANVAS_HEIGHT_CLASS} min-w-0 flex-1 items-center justify-center rounded-xl border border-surface-variant bg-surface-container-low text-sm text-on-surface-variant`}
      >
        Loading interactive degree map…
      </div>
    </div>
  );
}

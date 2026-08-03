import { DEGREE_MAP_CANVAS_HEIGHT_CLASS } from "@/components/graph/graphShell";

/**
 * Reserves toolbar + canvas (+ desktop panel / mobile toggle) space so
 * dynamically loading React Flow does not shift content below the map.
 */
export function DegreeMapGraphLoadingFallback() {
  return (
    <div className="flex flex-col gap-3" role="status" aria-live="polite">
      <div
        className="h-14 rounded-lg border border-surface-variant bg-surface-container-low"
        aria-hidden="true"
      />
      <div className={`flex min-h-0 ${DEGREE_MAP_CANVAS_HEIGHT_CLASS}`}>
        <div className="flex min-w-0 flex-1 items-center justify-center rounded-xl border border-surface-variant bg-surface-container-low text-sm text-on-surface-variant">
          Loading interactive degree map…
        </div>
        <div
          className="hidden w-[320px] shrink-0 border-l border-surface-variant bg-surface-container-low lg:block"
          aria-hidden="true"
        />
      </div>
      <div
        className="h-11 rounded-md border border-surface-variant bg-surface-container-low lg:hidden"
        aria-hidden="true"
      />
    </div>
  );
}

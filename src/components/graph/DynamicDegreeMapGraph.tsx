"use client";

import dynamic from "next/dynamic";
import type { DegreeMapGraphProps } from "@/components/graph/DegreeMapGraph";

const DegreeMapGraph = dynamic(
  () => import("@/components/graph/DegreeMapGraph").then((mod) => mod.DegreeMapGraph),
  {
    ssr: false,
    loading: () => (
      <div
        className="flex h-[650px] items-center justify-center rounded-xl border border-surface-variant bg-surface-container-low text-sm text-on-surface-variant"
        role="status"
        aria-live="polite"
      >
        Loading interactive degree map…
      </div>
    ),
  },
);

export function DynamicDegreeMapGraph(props: DegreeMapGraphProps) {
  return <DegreeMapGraph {...props} />;
}

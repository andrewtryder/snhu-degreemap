"use client";

import dynamic from "next/dynamic";
import type { DegreeMapGraphProps } from "@/components/graph/DegreeMapGraph";
import { DegreeMapGraphLoadingFallback } from "@/components/graph/DegreeMapGraphLoadingFallback";

const DegreeMapGraph = dynamic(
  () => import("@/components/graph/DegreeMapGraph").then((mod) => mod.DegreeMapGraph),
  {
    ssr: false,
    loading: () => <DegreeMapGraphLoadingFallback />,
  },
);

export function DynamicDegreeMapGraph(props: DegreeMapGraphProps) {
  return <DegreeMapGraph {...props} />;
}

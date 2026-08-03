import React from "react";
import { Metadata } from "next";
import { AppHeader } from "@/components/AppHeader";
import { AppFooter } from "@/components/AppFooter";
import { ProgramDirectory } from "@/components/programs/ProgramDirectory";
import { getCatalogLastUpdated, getPrograms, getCatalogYears } from "@/lib/serverData";

export const revalidate = false;

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Degree Programs Directory",
    description:
      "Browse unofficial SNHU degree requirements, major course maps, and prerequisite structures across active catalog years.",
    alternates: { canonical: "/programs" },
  };
}

export default async function ProgramsPage() {
  const [programs, years, lastUpdated] = await Promise.all([
    getPrograms(),
    getCatalogYears(),
    getCatalogLastUpdated(),
  ]);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <AppHeader currentPage="programs" />
      <main id="main-content" className="flex-1">
        <ProgramDirectory
          title="Degree Programs Directory"
          level="all"
          programs={programs}
          description={
            <p>
              Browse unofficial SNHU degree requirements, major course maps, and prerequisite structures
              across active catalog years ({years.join(", ")}).
            </p>
          }
        />
      </main>
      <AppFooter lastUpdated={lastUpdated} />
    </div>
  );
}

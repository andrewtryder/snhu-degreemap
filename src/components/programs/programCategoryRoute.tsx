import React from "react";
import { Metadata } from "next";
import { AppHeader } from "@/components/AppHeader";
import { AppFooter } from "@/components/AppFooter";
import { getCategoryMeta, ProgramDirectory } from "@/components/programs/ProgramDirectory";
import { getCatalogLastUpdated, getPrograms } from "@/lib/serverData";
import { filterProgramsByLevel, ProgramLevelPath } from "@/lib/programLevelCategories";

export function createCategoryMetadata(path: ProgramLevelPath) {
  const entry = getCategoryMeta(path);
  return async function generateMetadata(): Promise<Metadata> {
    return {
      title: entry.h1,
      description: entry.description,
      alternates: { canonical: `/programs/${entry.path}` },
    };
  };
}

export function createCategoryPage(path: ProgramLevelPath) {
  const entry = getCategoryMeta(path);

  return async function CategoryPage() {
    const [programs, lastUpdated] = await Promise.all([getPrograms(), getCatalogLastUpdated()]);
    const filteredPrograms = filterProgramsByLevel(programs, entry.category);

    return (
      <div className="flex min-h-screen flex-col bg-background">
        <AppHeader currentPage="programs" />
        <main id="main-content" className="flex-1">
          <ProgramDirectory
            title={entry.h1}
            level={entry.category}
            programs={filteredPrograms}
            relatedFromPath={entry.path}
            description={
              <>
                <p>{entry.intro}</p>
                <p>
                  Showing {filteredPrograms.length}{" "}
                  {filteredPrograms.length === 1 ? "program" : "programs"} in this category.
                </p>
              </>
            }
          />
        </main>
        <AppFooter lastUpdated={lastUpdated} />
      </div>
    );
  };
}

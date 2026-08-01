import React from "react";
import Link from "next/link";
import { Metadata } from "next";
import { AppHeader } from "@/components/AppHeader";
import { AppFooter } from "@/components/AppFooter";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { getCatalogLastUpdated, getPrograms, getCatalogYears } from "@/lib/serverData";
import {
  getProgramLevelCategory,
  parseProgramLevelFilter,
  PROGRAM_LEVEL_FILTERS,
  ProgramLevelCategory,
} from "@/lib/programLevelCategories";
import { DegreeProgram } from "@/types/program";
import { GraduationCapIcon, ArrowRightIcon } from "lucide-react";

export const revalidate = false;

export const metadata: Metadata = {
  alternates: { canonical: "/programs" },
};

export function filterProgramsByLevel(
  programs: DegreeProgram[],
  level: ProgramLevelCategory | "all"
): DegreeProgram[] {
  if (level === "all") return programs;
  return programs.filter((program) => getProgramLevelCategory(program) === level);
}

function levelHref(level: ProgramLevelCategory | "all") {
  return level === "all" ? "/programs" : `/programs?level=${level}`;
}

export function ProgramLevelFilterPills({ level }: { level: ProgramLevelCategory | "all" }) {
  return (
    <nav aria-label="Filter programs by credential level" className="flex flex-wrap gap-2">
      {([{"value": "all", "label": "All"}, ...PROGRAM_LEVEL_FILTERS] as const).map((filter) => {
        const active = level === filter.value;
        return (
          <Link
            key={filter.value}
            href={levelHref(filter.value)}
            aria-current={active ? "page" : undefined}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
              active
                ? "bg-primary text-on-primary"
                : "bg-surface-container text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface"
            }`}
          >
            {filter.label}
          </Link>
        );
      })}
    </nav>
  );
}

async function ProgramsContent({ level }: { level: ProgramLevelCategory | "all" }) {
  const [programs, years] = await Promise.all([getPrograms(), getCatalogYears()]);
  const filteredPrograms = filterProgramsByLevel(programs, level);

  return (
    <div className="mx-auto w-full max-w-[var(--spacing-container-max)] space-y-6 px-4 py-8 md:px-8">
      <div>
        <h1 className="font-[family-name:var(--font-headline)] text-2xl font-extrabold text-primary sm:text-3xl">
          Degree Programs Directory
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-on-surface-variant">
          Browse unofficial SNHU degree requirements, major course maps, and prerequisite structures across active catalog years ({years.join(", ")}).
        </p>
      </div>

      <ProgramLevelFilterPills level={level} />

      {filteredPrograms.length === 0 ? (
        <div role="status" className="rounded-xl border border-surface-variant bg-surface-container-low p-6 text-sm text-on-surface-variant">
          No programs were found in this category.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
          {filteredPrograms.map((program) => (
            <Card key={program.slug} hoverable className="flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <Badge variant="outline">{program.degreeLevel}</Badge>
                  <span className="text-[11px] font-semibold text-outline">{program.catalogYear}</span>
                </div>

                <div className="flex items-start gap-2.5">
                  <div className="mt-0.5 shrink-0 rounded-md bg-primary-fixed/30 p-2 text-primary">
                    <GraduationCapIcon className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-on-surface transition-colors hover:text-primary">
                      <Link href={`/programs/${program.slug}`}>{program.title}</Link>
                    </h2>
                    <p className="mt-0.5 text-xs text-on-surface-variant">{program.credential}</p>
                  </div>
                </div>

                <p className="line-clamp-3 text-xs text-on-surface-variant">{program.description}</p>
              </div>

              <div className="flex items-center justify-between border-t border-surface-variant pt-3 text-xs text-on-surface-variant">
                <span>{program.totalCredits == null ? "N/A Credits" : `${program.totalCredits} Credits`} • {program.requiredCourseCount} Courses</span>
                <Link href={`/programs/${program.slug}`} className="flex items-center gap-1 font-semibold text-primary hover:underline">
                  Explore Map <ArrowRightIcon className="h-3.5 w-3.5" />
                </Link>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

export default async function ProgramsPage({
  searchParams,
}: {
  searchParams: Promise<{ level?: string }>;
}) {
  const { level: rawLevel } = await searchParams;
  const level = parseProgramLevelFilter(rawLevel);
  const lastUpdated = await getCatalogLastUpdated();

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <AppHeader currentPage="programs" />
      <main id="main-content" className="flex-1">
        <ProgramsContent level={level} />
      </main>
      <AppFooter lastUpdated={lastUpdated} />
    </div>
  );
}

import React from "react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import {
  getProgramLevelHref,
  getRelatedCategoryPaths,
  PROGRAM_LEVEL_FILTERS,
  PROGRAM_LEVEL_PATHS,
  ProgramLevelCategory,
  ProgramLevelPath,
} from "@/lib/programLevelCategories";
import { DegreeProgram } from "@/types/program";
import { GraduationCapIcon, ArrowRightIcon } from "lucide-react";

export function ProgramLevelFilterPills({ level }: { level: ProgramLevelCategory | "all" }) {
  return (
    <nav aria-label="Filter programs by credential level" className="flex flex-wrap gap-2">
      {([{ value: "all" as const, label: "All" }, ...PROGRAM_LEVEL_FILTERS] as const).map((filter) => {
        const active = level === filter.value;
        return (
          <Link
            key={filter.value}
            href={getProgramLevelHref(filter.value)}
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

function ProgramCardGrid({ programs }: { programs: DegreeProgram[] }) {
  if (programs.length === 0) {
    return (
      <div role="status" className="rounded-xl border border-surface-variant bg-surface-container-low p-6 text-sm text-on-surface-variant">
        No programs were found in this category.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
      {programs.map((program) => (
        <Card key={program.slug} hoverable className="flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Badge variant="outline">{program.degreeLevel}</Badge>
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
            <span>
              {program.totalCredits == null ? "N/A Credits" : `${program.totalCredits} Credits`} •{" "}
              {program.requiredCourseCount} Courses
            </span>
            <Link
              href={`/programs/${program.slug}`}
              className="flex items-center gap-1 font-semibold text-primary hover:underline"
            >
              Explore Map <ArrowRightIcon className="h-3.5 w-3.5" />
            </Link>
          </div>
        </Card>
      ))}
    </div>
  );
}

type ProgramDirectoryProps = {
  title: string;
  description: React.ReactNode;
  level: ProgramLevelCategory | "all";
  programs: DegreeProgram[];
  relatedFromPath?: ProgramLevelPath;
};

export function ProgramDirectory({
  title,
  description,
  level,
  programs,
  relatedFromPath,
}: ProgramDirectoryProps) {
  const relatedCategories = relatedFromPath ? getRelatedCategoryPaths(relatedFromPath) : [];

  return (
    <div className="mx-auto w-full max-w-[var(--spacing-container-max)] space-y-6 px-4 py-8 md:px-8">
      <div>
        <h1 className="font-[family-name:var(--font-headline)] text-2xl font-extrabold text-primary sm:text-3xl">
          {title}
        </h1>
        <div className="mt-1 max-w-2xl space-y-2 text-sm text-on-surface-variant">{description}</div>
      </div>

      <ProgramLevelFilterPills level={level} />

      <ProgramCardGrid programs={programs} />

      {relatedFromPath ? (
        <nav aria-label="Related program categories" className="border-t border-surface-variant pt-6">
          <h2 className="text-sm font-bold text-on-surface">Related categories</h2>
          <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-sm">
            <li>
              <Link href="/programs" className="font-semibold text-primary hover:underline">
                All programs
              </Link>
            </li>
            {relatedCategories.map((entry) => (
              <li key={entry.path}>
                <Link href={`/programs/${entry.path}`} className="font-semibold text-primary hover:underline">
                  {entry.h1}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      ) : null}
    </div>
  );
}

export function getCategoryMeta(path: ProgramLevelPath) {
  const entry = PROGRAM_LEVEL_PATHS.find((item) => item.path === path);
  if (!entry) {
    throw new Error(`Unknown program category path: ${path}`);
  }
  return entry;
}

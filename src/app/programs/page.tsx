import React, { Suspense } from "react";
import Link from "next/link";
import { AppHeader } from "@/components/AppHeader";
import { AppFooter } from "@/components/AppFooter";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { getPrograms, getCatalogYears } from "@/lib/serverData";
import { GraduationCapIcon, ArrowRightIcon } from "lucide-react";

export const revalidate = false; // Tag-based invalidation

async function ProgramsContent() {
  const programs = await getPrograms();
  const years = await getCatalogYears();

  return (
    <div className="mx-auto w-full max-w-[var(--spacing-container-max)] px-4 py-8 md:px-8 space-y-6">
      {/* Header Banner */}
      <div>
        <h1 className="font-[family-name:var(--font-headline)] text-2xl sm:text-3xl font-extrabold text-primary">
          Degree Programs Directory
        </h1>
        <p className="mt-1 text-sm text-on-surface-variant max-w-2xl">
          Browse unofficial SNHU degree requirements, major course maps, and prerequisite structures across active catalog years ({years.join(", ")}).
        </p>
      </div>

      {/* Program Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {programs.map((program) => (
          <Card
            key={program.slug}
            hoverable
            className="flex flex-col justify-between space-y-4"
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <Badge variant="outline">{program.degreeLevel}</Badge>
                <span className="text-[11px] font-semibold text-outline">
                  {program.catalogYear}
                </span>
              </div>

              <div className="flex items-start gap-2.5">
                <div className="rounded-md bg-primary-fixed/30 p-2 text-primary shrink-0 mt-0.5">
                  <GraduationCapIcon className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-on-surface hover:text-primary transition-colors">
                    <Link href={`/programs/${program.slug}`}>{program.title}</Link>
                  </h2>
                  <p className="text-xs text-on-surface-variant mt-0.5">
                    {program.credential}
                  </p>
                </div>
              </div>

              <p className="text-xs text-on-surface-variant line-clamp-3">
                {program.description}
              </p>
            </div>

            <div className="border-t border-surface-variant pt-3 flex items-center justify-between text-xs text-on-surface-variant">
              <span>{program.totalCredits == null ? "N/A Credits" : `${program.totalCredits} Credits`} • {program.requiredCourseCount} Courses</span>
              <Link
                href={`/programs/${program.slug}`}
                className="font-semibold text-primary hover:underline flex items-center gap-1"
              >
                Explore Map <ArrowRightIcon className="h-3.5 w-3.5" />
              </Link>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

export default function ProgramsPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <AppHeader currentPage="programs" />
      <main id="main-content" className="flex-1">
        <Suspense fallback={<div className="p-8 text-center text-sm text-outline">Loading program catalog directory...</div>}>
          <ProgramsContent />
        </Suspense>
      </main>
      <AppFooter />
    </div>
  );
}

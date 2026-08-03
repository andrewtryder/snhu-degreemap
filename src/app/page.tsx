import React from "react";
import Link from "next/link";
import { AppHeader } from "@/components/AppHeader";
import { AppFooter } from "@/components/AppFooter";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { getCatalogLastUpdated, getPrograms } from "@/lib/serverData";
import { resolvePopularBachelorPrograms } from "@/lib/popularBachelorPrograms";
import { ArrowRightIcon } from "lucide-react";

export const revalidate = false;

export default async function HomePage() {
  const [programs, lastUpdated] = await Promise.all([getPrograms(), getCatalogLastUpdated()]);
  const popularBachelorPrograms = resolvePopularBachelorPrograms(programs);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <AppHeader currentPage="home" initialPrograms={programs} />

      <main id="main-content" className="flex-1">
        <div className="mx-auto w-full max-w-[var(--spacing-container-max)] px-4 py-8 md:px-8 space-y-8">
          <Card className="relative overflow-hidden border-primary/20 bg-linear-to-br from-surface-container-lowest via-surface-container-low to-surface-container-lowest p-6 sm:p-8 shadow-md">
            <div className="max-w-3xl space-y-4">
              <h1 className="font-[family-name:var(--font-headline)] text-3xl sm:text-4xl font-extrabold tracking-tight text-primary">
                SNHU Degree Map
              </h1>

              <p className="text-base sm:text-lg text-on-surface-variant leading-relaxed">
                Explore interactive prerequisite graphs, degree requirement structures, and course sequencing for Southern New Hampshire University programs.
              </p>
            </div>
          </Card>

          <section className="space-y-4">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="font-[family-name:var(--font-headline)] text-xl font-bold text-on-surface">
                  Popular Bachelor’s Programs
                </h2>
                <p className="text-xs text-on-surface-variant">
                  A curated selection of bachelor’s degree maps. Browse the full directory for every
                  available program.
                </p>
              </div>
              <Link
                href="/programs"
                className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
              >
                View all programs <ArrowRightIcon className="h-3.5 w-3.5" />
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {popularBachelorPrograms.map((program) => (
                <Card
                  key={program.slug}
                  hoverable
                  className="flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <Badge variant="outline">{program.degreeLevel}</Badge>
                      <span className="text-[11px] font-semibold text-outline">
                        {program.catalogYear}
                      </span>
                    </div>

                    <h3 className="text-lg font-bold text-on-surface hover:text-primary transition-colors">
                      <Link href={`/programs/${program.slug}`}>{program.title}</Link>
                    </h3>

                    <p className="text-xs text-on-surface-variant line-clamp-2">
                      {program.description}
                    </p>
                  </div>

                  <div className="border-t border-surface-variant pt-3 flex items-center justify-between text-xs text-on-surface-variant">
                    <span>
                      {program.totalCredits == null
                        ? "Credits not specified"
                        : `${program.totalCredits} Total Credits`}
                    </span>
                    <Link
                      href={`/programs/${program.slug}`}
                      className="font-semibold text-primary hover:underline flex items-center gap-1"
                    >
                      View Map <ArrowRightIcon className="h-3 w-3" />
                    </Link>
                  </div>
                </Card>
              ))}
            </div>

            <p className="text-xs text-on-surface-variant">
              <Link href="/programs/bachelors" className="font-semibold text-primary hover:underline">
                Browse all bachelor’s programs
              </Link>
            </p>
          </section>
        </div>
      </main>

      <AppFooter lastUpdated={lastUpdated} />
    </div>
  );
}

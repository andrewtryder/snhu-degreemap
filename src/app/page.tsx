import React from "react";
import Link from "next/link";
import { AppHeader } from "@/components/AppHeader";
import { AppFooter } from "@/components/AppFooter";
import { Card } from "@/components/ui/Card";
import { MetricCard } from "@/components/ui/MetricCard";
import { Badge } from "@/components/ui/Badge";
import { fixturePrograms } from "@/data/fixturePrograms";
import {
  GraduationCapIcon,
  BookOpenIcon,
  GitForkIcon,
  ArrowRightIcon,
  CheckCircle2Icon,
  AlertTriangleIcon,
} from "lucide-react";

export const revalidate = false;

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <AppHeader currentPage="home" />

      <main id="main-content" className="flex-1">
        <div className="mx-auto w-full max-w-[var(--spacing-container-max)] px-4 py-8 md:px-8 space-y-8">
          {/* Hero Introductory Card */}
          <Card className="relative overflow-hidden border-primary/20 bg-linear-to-br from-surface-container-lowest via-surface-container-low to-surface-container-lowest p-6 sm:p-8 shadow-md">
            <div className="max-w-3xl space-y-4">
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary-fixed/20 px-3 py-1 text-xs font-semibold text-primary">
                <GitForkIcon className="h-3.5 w-3.5" /> Unofficial SNHU Degree & Prerequisite Visualizer
              </div>

              <h1 className="font-[family-name:var(--font-headline)] text-3xl sm:text-4xl font-extrabold tracking-tight text-primary">
                SNHU Degree Map
              </h1>

              <p className="text-base sm:text-lg text-on-surface-variant leading-relaxed">
                Explore interactive prerequisite graphs, degree requirement structures, and course sequencing for Southern New Hampshire University programs.
              </p>

              <div className="flex flex-wrap items-center gap-3 pt-2">
                <Link
                  href="/programs/computer-science-bs"
                  className="inline-flex items-center justify-center rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-on-primary shadow-sm transition-colors hover:bg-primary-container"
                >
                  View Computer Science (BS) Map <ArrowRightIcon className="ml-2 h-4 w-4" />
                </Link>
                <Link
                  href="/programs"
                  className="inline-flex items-center justify-center rounded-lg border border-outline-variant bg-surface px-4 py-2.5 text-sm font-medium text-on-surface transition-colors hover:bg-surface-container"
                >
                  Explore All Programs
                </Link>
              </div>
            </div>

            {/* Prototype Banner */}
            <div className="mt-6 rounded-lg border border-amber-200 bg-amber-50 p-3.5 text-xs text-amber-900 flex items-start gap-2.5">
              <AlertTriangleIcon className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
              <div>
                <strong>Prototype Notice:</strong> SNHU Degree Map is an unofficial educational tool. Always verify degree requirements, transfer credit policies, and prerequisites with your SNHU academic advisor.
              </div>
            </div>
          </Card>

          {/* Discovery Metrics Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard
              label="Available Programs"
              value={fixturePrograms.length}
              subtext="BS, BA, & RN-to-BSN pathways"
              icon={<GraduationCapIcon className="h-5 w-5 text-primary" />}
            />
            <MetricCard
              label="Catalog Year"
              value="2025–2026"
              subtext="Current active fixture catalog"
              icon={<BookOpenIcon className="h-5 w-5 text-primary" />}
            />
            <MetricCard
              label="Interactive Graph"
              value="React Flow + Dagre"
              subtext="Prerequisite & corequisite nodes"
              icon={<GitForkIcon className="h-5 w-5 text-primary" />}
            />
            <MetricCard
              label="Accessibility"
              value="Dual View Mode"
              subtext="Graph map & list fallback"
              icon={<CheckCircle2Icon className="h-5 w-5 text-primary" />}
            />
          </div>

          {/* Featured Programs Directory Section */}
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-[family-name:var(--font-headline)] text-xl font-bold text-on-surface">
                  Browse Degree Programs
                </h2>
                <p className="text-xs text-on-surface-variant">
                  Select a degree program to inspect its course flow, requirement groups, and prerequisite graph.
                </p>
              </div>
              <Link
                href="/programs"
                className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
              >
                View all ({fixturePrograms.length}) <ArrowRightIcon className="h-3.5 w-3.5" />
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {fixturePrograms.map((program) => (
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
                    <span>{program.totalCredits == null ? "N/A Total Credits" : `${program.totalCredits} Total Credits`}</span>
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
          </section>
        </div>
      </main>

      <AppFooter />
    </div>
  );
}

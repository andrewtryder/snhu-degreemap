import React from "react";
import Link from "next/link";
import { AppHeader } from "@/components/AppHeader";
import { AppFooter } from "@/components/AppFooter";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { GraduationCapIcon, ExternalLinkIcon, ShieldAlertIcon, FileTextIcon, ActivityIcon } from "lucide-react";

export const metadata = {
  title: "About SNHU Degree Map | Unofficial Prerequisite Visualization Tool",
  description: "Learn about SNHU Degree Map, an unofficial degree requirement and course prerequisite mapping tool designed for Southern New Hampshire University students.",
};

export default function AboutPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <AppHeader currentPage="about" />
      <main id="main-content" className="flex-1">
        <div className="mx-auto w-full max-w-[var(--spacing-container-max)] px-4 py-8 md:px-8 space-y-8">
          {/* Page Title */}
          <div className="space-y-2">
            <Badge variant="outline">Educational Project</Badge>
            <h1 className="font-[family-name:var(--font-headline)] text-2xl sm:text-3xl font-extrabold text-primary">
              About SNHU Degree Map
            </h1>
            <p className="text-sm text-on-surface-variant max-w-2xl leading-relaxed">
              SNHU Degree Map is an unofficial, open-source tool designed to help students search degree programs, visualize prerequisite trees, and understand graduation requirement structures.
            </p>
          </div>

          {/* Project Purpose */}
          <Card className="space-y-4">
            <h2 className="text-lg font-bold text-on-surface flex items-center gap-2">
              <GraduationCapIcon className="h-5 w-5 text-primary" /> Purpose & Vision
            </h2>
            <p className="text-xs sm:text-sm text-on-surface-variant leading-relaxed">
              Navigating degree requirements across 8-week online terms and 16-week campus schedules can be challenging. SNHU Degree Map parses official catalog data into clean interactive graphs using React Flow and Dagre, allowing students to explore course prerequisite depth, starting courses, and requirement groups at a glance.
            </p>
          </Card>

          {/* Quick Links Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="space-y-2">
              <h3 className="text-sm font-bold text-on-surface flex items-center gap-1.5">
                <FileTextIcon className="h-4 w-4 text-primary" /> Data Methodology
              </h3>
              <p className="text-xs text-on-surface-variant">
                Learn how requirement trees, all-of / choose-N logic, and prerequisite edges are parsed from source catalog endpoints.
              </p>
              <Link href="/methodology" className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline pt-1">
                Read Data Methodology →
              </Link>
            </Card>

            <Card className="space-y-2">
              <h3 className="text-sm font-bold text-on-surface flex items-center gap-1.5">
                <ActivityIcon className="h-4 w-4 text-primary" /> System & Data Status
              </h3>
              <p className="text-xs text-on-surface-variant">
                Check active catalog IDs, last synchronization runs, program counts, and parser health diagnostics.
              </p>
              <Link href="/data-status" className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline pt-1">
                Check Data Status →
              </Link>
            </Card>
          </div>

          {/* Disclaimer & Unofficial Status */}
          <Card className="border-amber-300 bg-amber-50/50 space-y-3">
            <h2 className="text-sm font-bold text-amber-900 flex items-center gap-2">
              <ShieldAlertIcon className="h-5 w-5 text-amber-700" /> Trademark & Unofficial Status Disclaimer
            </h2>
            <p className="text-xs text-amber-800 leading-relaxed">
              <strong>Unofficial Tool:</strong> SNHU Degree Map is an independent open-source software project. It is not affiliated with, endorsed by, sponsored by, or associated with Southern New Hampshire University (SNHU). Southern New Hampshire University and all associated degree program titles are trademarks of their respective owners.
            </p>
            <p className="text-xs text-amber-800 leading-relaxed">
              Always verify your official degree evaluation, course prerequisite standing, and graduation audit with your designated SNHU academic advisor.
            </p>
          </Card>

          {/* Source Code & Issues Link */}
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-surface-variant bg-surface-container-low p-4 text-xs">
            <div>
              <span className="font-bold text-on-surface">Open Source Project:</span> Built with Next.js App Router, Tailwind CSS, PostgreSQL, and React Flow.
            </div>
            <a
              href="https://github.com/andrewtryder/snhu-degreemap"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 font-semibold text-primary hover:underline"
            >
              GitHub Repository (andrewtryder/snhu-degreemap) <ExternalLinkIcon className="h-3.5 w-3.5" />
            </a>
          </div>
        </div>
      </main>
      <AppFooter />
    </div>
  );
}

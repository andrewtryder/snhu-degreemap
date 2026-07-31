import React from "react";
import Link from "next/link";
import { AppHeader } from "@/components/AppHeader";
import { AppFooter } from "@/components/AppFooter";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { BookOpenIcon, DatabaseIcon, CpuIcon, CheckCircle2Icon, InfoIcon } from "lucide-react";

export const metadata = {
  title: "Data Methodology & Catalog Synchronization | SNHU Degree Map",
  description: "Learn how SNHU Degree Map parses Kuali catalog endpoints, extracts requirement trees, builds prerequisite graphs, and flags source anomalies.",
};

export default function MethodologyPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <AppHeader currentPage="about" />
      <main id="main-content" className="flex-1">
        <div className="mx-auto w-full max-w-[var(--spacing-container-max)] px-4 py-8 md:px-8 space-y-8">
          {/* Header */}
          <div className="space-y-2">
            <Badge variant="outline">Technical Documentation</Badge>
            <h1 className="font-[family-name:var(--font-headline)] text-2xl sm:text-3xl font-extrabold text-primary">
              Data Processing & Graph Analysis Methodology
            </h1>
            <p className="text-sm text-on-surface-variant max-w-3xl leading-relaxed">
              This document details how SNHU Degree Map ingests public catalog records, parses complex requirement trees, generates course prerequisite graphs, and maintains high fidelity with official academic source material.
            </p>
          </div>

          {/* Core Pipeline Sections */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="space-y-3">
              <div className="rounded-md bg-primary-fixed/30 p-2 text-primary w-fit">
                <DatabaseIcon className="h-5 w-5" />
              </div>
              <h2 className="text-base font-bold text-on-surface">1. Catalog Ingestion</h2>
              <p className="text-xs text-on-surface-variant leading-relaxed">
                Scheduled background synchronization jobs run externally via CircleCI, querying public REST endpoints on Kuali catalog host <code className="font-mono text-primary">snhu.kuali.co</code>. Source records are snapshot into PostgreSQL staging tables.
              </p>
            </Card>

            <Card className="space-y-3">
              <div className="rounded-md bg-primary-fixed/30 p-2 text-primary w-fit">
                <CpuIcon className="h-5 w-5" />
              </div>
              <h2 className="text-base font-bold text-on-surface">2. Requirement Parsing</h2>
              <p className="text-xs text-on-surface-variant leading-relaxed">
                Using Cheerio HTML DOM extraction, nested section rules are extracted into structured models (<code className="font-mono text-primary">all_of</code>, <code className="font-mono text-primary">choose_n</code>, minimum credits, concentrations, and free electives). Unparsed sections are explicitly stored and flagged.
              </p>
            </Card>

            <Card className="space-y-3">
              <div className="rounded-md bg-primary-fixed/30 p-2 text-primary w-fit">
                <BookOpenIcon className="h-5 w-5" />
              </div>
              <h2 className="text-base font-bold text-on-surface">3. Prerequisite Graph Analysis</h2>
              <p className="text-xs text-on-surface-variant leading-relaxed">
                Course descriptions are normalized across catalog formatting variants, then prerequisite and corequisite clauses are parsed independently. Explicit course references, including external prerequisites, are shown as informational links; unresolved course records are excluded from starting-course insights. Graphs are rendered using React Flow and Dagre.
              </p>
            </Card>
          </div>

          {/* Accuracy & Integrity Guarantees */}
          <Card className="space-y-4">
            <h2 className="text-lg font-bold text-on-surface flex items-center gap-2">
              <CheckCircle2Icon className="h-5 w-5 text-tertiary" /> Accuracy Rules & Non-Invention Policy
            </h2>
            <ul className="space-y-2 text-xs text-on-surface-variant list-disc list-inside leading-relaxed">
              <li><strong>Zero Requirement Invention:</strong> Course codes, titles, credit thresholds, and prerequisite relationships are derived exclusively from source catalog records. No artificial dependencies are created.</li>
              <li><strong>Cycle & Anomaly Handling:</strong> Circular prerequisite references in source records are detected using DFS traversal and flagged with visual warnings without breaking page layout.</li>
              <li><strong>Staging & Promotion Safeguards:</strong> Database updates occur atomically inside a PostgreSQL transaction only after validating staging schema integrity and verifying that no material shrink occurred.</li>
            </ul>
          </Card>

          {/* Disclaimer & Verification Notice */}
          <div className="rounded-xl border border-outline-variant bg-surface-container-low p-5 text-xs text-on-surface-variant space-y-2">
            <h3 className="font-bold text-on-surface flex items-center gap-1.5 text-sm">
              <InfoIcon className="h-4 w-4 text-primary" /> Verification Reminder
            </h3>
            <p className="leading-relaxed">
              SNHU Degree Map is an unofficial educational tool designed for program planning and prerequisite visualization. Catalog requirements, term availability, and course offerings are subject to change by Southern New Hampshire University. Always review your official academic evaluation with your SNHU academic advisor.
            </p>
            <div className="pt-2">
              <Link href="/data-status" className="font-semibold text-primary hover:underline">
                View Live Data Synchronization Status →
              </Link>
            </div>
          </div>
        </div>
      </main>
      <AppFooter />
    </div>
  );
}

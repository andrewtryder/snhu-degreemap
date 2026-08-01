import React, { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Metadata } from "next";
import { AppHeader } from "@/components/AppHeader";
import { AppFooter } from "@/components/AppFooter";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { DegreeMapGraph } from "@/components/graph/DegreeMapGraph";
import { getCatalogLastUpdated, getProgramBySlug } from "@/lib/serverData";
import { buildDegreeGraph } from "@/lib/graphTransformer";
import { calculateProgramTransferInsights, getTransferUrlForCourse } from "@/lib/transferIntegration";
import {
  CalendarIcon,
  ExternalLinkIcon,
  AlertTriangleIcon,
  SparklesIcon,
  ZapIcon,
  GitBranchIcon,
} from "lucide-react";

export const dynamicParams = true;
export const revalidate = false;

export async function generateStaticParams() {
  return [];
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const resolvedParams = await params;
  const program = await getProgramBySlug(resolvedParams.slug);

  if (!program) {
    return {
      title: "Program Not Found | SNHU Degree Map",
      description: "The requested degree program map could not be found.",
    };
  }

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL || "https://snhu-degreemap.vercel.app";
  const title = `SNHU ${program.title} (${program.degreeLevel}) Degree Map & Requirement Guide`;
  const description = `Explore unofficial SNHU ${program.title} (${program.credential}) degree requirements, prerequisite graph, starting courses, and credit structure (${program.catalogYear}).`;

  return {
    title,
    description,
    alternates: {
      canonical: `${baseUrl}/programs/${program.slug}`,
    },
    openGraph: {
      title,
      description,
      url: `${baseUrl}/programs/${program.slug}`,
      siteName: "SNHU Degree Map",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
    robots: {
      index: true,
      follow: true,
    },
  };
}

export async function ProgramDetailContent({ slug }: { slug: string }) {
  const program = await getProgramBySlug(slug);

  if (!program) {
    notFound();
  }

  const graphData = buildDegreeGraph(program.nodes, program.edges);
  const { startingCourses, criticalCourses, longestPath, longestPathLength, hasCycle, cycleNodes } = graphData.insights;

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL || "https://snhu-degreemap.vercel.app";
  const transferInsights = calculateProgramTransferInsights(program);

  // Safe JSON-LD Structured Data
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": `${baseUrl}/#website`,
        url: baseUrl,
        name: "SNHU Degree Map",
        description: "Unofficial degree requirement and course prerequisite visualization tool",
      },
      {
        "@type": "WebPage",
        "@id": `${baseUrl}/programs/${program.slug}#webpage`,
        url: `${baseUrl}/programs/${program.slug}`,
        name: `${program.title} Degree Map`,
        description: program.description,
        isPartOf: { "@id": `${baseUrl}/#website` },
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: baseUrl },
          { "@type": "ListItem", position: 2, name: "Programs", item: `${baseUrl}/programs` },
          { "@type": "ListItem", position: 3, name: program.title, item: `${baseUrl}/programs/${program.slug}` },
        ],
      },
      {
        "@type": "EducationalOccupationalProgram",
        name: program.title,
        educationalCredentialAwarded: program.credential,
        provider: {
          "@type": "EducationalOrganization",
          name: "Southern New Hampshire University (Referenced Source)",
          sameAs: "https://www.snhu.edu",
        },
      },
    ],
  };

  return (
    <div className="mx-auto w-full max-w-[var(--spacing-container-max)] px-4 py-8 md:px-8 space-y-6">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <nav className="flex items-center gap-2 text-xs text-on-surface-variant">
        <Link href="/" className="hover:text-primary hover:underline">
          Home
        </Link>
        <span>/</span>
        <Link href="/programs" className="hover:text-primary hover:underline">
          Programs
        </Link>
        <span>/</span>
        <span className="font-semibold text-on-surface">{program.title}</span>
      </nav>

      <div className="rounded-xl border border-surface-variant bg-surface-container-lowest p-6 shadow-sm space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1 max-w-3xl">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline">{program.degreeLevel}</Badge>
              <span className="inline-flex items-center gap-1 rounded-full bg-surface-container px-2.5 py-0.5 text-xs font-semibold text-on-surface-variant">
                <CalendarIcon className="h-3 w-3" /> Catalog {program.catalogYear}
              </span>
            </div>

            <h1 className="font-[family-name:var(--font-headline)] text-2xl sm:text-3xl font-extrabold tracking-tight text-primary">
              {program.title}
            </h1>
            <p className="text-sm font-semibold text-on-surface">{program.credential}</p>
          </div>

          {program.sourceCatalogUrl && (
            <a
              href={program.sourceCatalogUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg border border-outline-variant bg-surface-container-low px-3 py-1.5 text-xs font-medium text-on-surface hover:bg-surface-container hover:text-primary transition-colors"
            >
              <span>Official SNHU Catalog</span>
              <ExternalLinkIcon className="h-3.5 w-3.5" />
            </a>
          )}
        </div>

        <p className="text-xs sm:text-sm leading-relaxed text-on-surface-variant max-w-4xl">{program.description}</p>
      </div>

      <Card className="border-emerald-200 bg-emerald-50/50 space-y-2">
        <h2 className="text-sm font-bold text-emerald-950">Transfer Integration</h2>
        <p className="text-xs text-emerald-900">
          {transferInsights.transferableCoursesCount} of {transferInsights.totalCourses} required courses have known
          transfer equivalencies ({transferInsights.coveragePercentage}%).
        </p>

        {transferInsights.transferableCourseCodes.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            <span className="text-xs font-semibold text-emerald-900 self-center mr-1">
              Courses with known transfer listings:
            </span>
            {transferInsights.transferableCourseCodes.map((code) => {
              const href = getTransferUrlForCourse(code);
              if (!href) {
                return (
                  <span
                    key={code}
                    className="rounded-full border border-emerald-300 bg-white px-2.5 py-0.5 text-xs font-medium text-emerald-800"
                  >
                    {code}
                  </span>
                );
              }
              return (
                <a
                  key={code}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`View transfer equivalencies for ${code}`}
                  className="rounded-full border border-emerald-300 bg-white px-2.5 py-0.5 text-xs font-medium text-emerald-800 transition-colors hover:bg-emerald-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
                >
                  {code}
                </a>
              );
            })}
          </div>
        )}
      </Card>

      <div className="space-y-4">
        <DegreeMapGraph
          nodesData={program.nodes}
          edgesData={program.edges}
          programTitle={program.title}
          catalogYear={program.catalogYear}
          sourceName={program.sourceName}
        />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="space-y-2">
            <h3 className="text-sm font-bold text-on-surface flex items-center gap-1.5">
              <SparklesIcon className="h-4 w-4 text-tertiary" /> Starting Courses ({startingCourses.length})
            </h3>
            <p className="text-xs text-on-surface-variant">
              Resolved degree courses with no known prerequisite links (not an enrollment determination):
            </p>
            <div className="flex flex-wrap gap-1.5 pt-1">
              {startingCourses.map((code) => (
                <Badge key={code} variant="gened">
                  {code}
                </Badge>
              ))}
            </div>
          </Card>

          <Card className="space-y-2">
            <h3 className="text-sm font-bold text-on-surface flex items-center gap-1.5">
              <ZapIcon className="h-4 w-4 text-secondary" /> Critical Path Courses ({criticalCourses.length})
            </h3>
            <p className="text-xs text-on-surface-variant">
              Core courses that unlock multiple downstream degree requirements:
            </p>
            <div className="flex flex-wrap gap-1.5 pt-1">
              {criticalCourses.map((code) => (
                <Badge key={code} variant="major">
                  {code}
                </Badge>
              ))}
            </div>
          </Card>

          <Card className="space-y-2">
            <h3 className="text-sm font-bold text-on-surface flex items-center gap-1.5">
              <GitBranchIcon className="h-4 w-4 text-primary" /> Longest Prerequisite Chain
            </h3>
            <p className="text-xs font-mono font-semibold text-primary">{longestPath.join(" → ")}</p>
            <p className="text-[11px] text-on-surface-variant">
              Longest known prerequisite chain: {longestPathLength} courses
            </p>
          </Card>
        </div>

        {hasCycle && (
          <Card className="border-amber-300 bg-amber-50 space-y-1">
            <h3 className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
              <AlertTriangleIcon className="h-4 w-4 text-amber-700" /> Prerequisite Cycle Detected
            </h3>
            <p className="text-xs text-amber-800">
              Source requirements contain a circular prerequisite relationship involving: {cycleNodes?.join(", ")}.
              Verify sequencing with an SNHU advisor.
            </p>
          </Card>
        )}
      </div>

      <section className="space-y-6 pt-6 border-t border-surface-variant">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-on-surface">Program Requirement Groups & Course Listing</h2>
            <p className="text-xs text-on-surface-variant">Credit totals by degree requirement category.</p>
          </div>
          <Link
            href={`/programs/${program.slug}/requirements`}
            className="inline-flex items-center rounded-lg border border-outline-variant bg-surface-container-low px-3 py-1.5 text-xs font-semibold text-on-surface transition-colors hover:bg-surface-container hover:text-primary"
          >
            View full courses and requirements
          </Link>
        </div>

        <div className="space-y-4">
          {program.groups.map((group) => (
            <Card key={group.id} className="border-l-4 py-4" style={{ borderLeftColor: group.colorTheme.border }}>
              <h3 className="text-sm font-bold text-on-surface">{group.title}</h3>
              <p className="mt-1 text-xs font-semibold text-on-surface-variant">
                {group.totalCredits == null ? "Credits not specified" : `${group.totalCredits} Total Credits`}
              </p>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}

export default async function ProgramDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const resolvedParams = await params;
  const lastUpdated = await getCatalogLastUpdated();

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <AppHeader currentPage="program-detail" />
      <main id="main-content" className="flex-1">
        <Suspense fallback={<div className="p-8 text-center text-sm text-outline">Loading degree map...</div>}>
          <ProgramDetailContent slug={resolvedParams.slug} />
        </Suspense>
      </main>
      <AppFooter lastUpdated={lastUpdated} />
    </div>
  );
}

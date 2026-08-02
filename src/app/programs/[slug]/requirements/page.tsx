import React, { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Metadata } from "next";
import { AppHeader } from "@/components/AppHeader";
import { AppFooter } from "@/components/AppFooter";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { getCatalogLastUpdated, getProgramBySlug, toIsoDateString } from "@/lib/serverData";
import { getSiteUrl } from "@/lib/siteUrl";
import { isIndexableDeployment } from "@/lib/deploymentEnv";
import {
  buildProgramRequirementsDescription,
  buildProgramRequirementsTitle,
} from "@/lib/programSeo";
import {
  getRequirementInstruction,
  RequirementTreeItems,
} from "@/components/programs/RequirementTree";
import { ProgramCourseInventory } from "@/components/programs/ProgramCourseInventory";
import { CalendarIcon, ArrowLeftIcon } from "lucide-react";

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
      title: "Program Requirements Not Found",
      description: "The requested degree program requirements page could not be found.",
      robots: { index: false, follow: false },
    };
  }

  const baseUrl = getSiteUrl();
  const title = buildProgramRequirementsTitle(program);
  const description = buildProgramRequirementsDescription(program);

  return {
    title,
    description,
    alternates: {
      canonical: `${baseUrl}/programs/${program.slug}/requirements`,
    },
    openGraph: {
      title,
      description,
      url: `${baseUrl}/programs/${program.slug}/requirements`,
      siteName: "SNHU Degree Map",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
    robots: isIndexableDeployment()
      ? { index: true, follow: true }
      : { index: false, follow: false },
  };
}

export async function ProgramRequirementsContent({ slug }: { slug: string }) {
  const program = await getProgramBySlug(slug);

  if (!program) {
    notFound();
  }

  const baseUrl = getSiteUrl();
  const pageUrl = `${baseUrl}/programs/${program.slug}/requirements`;
  const programUrl = `${baseUrl}/programs/${program.slug}`;
  const programId = `${programUrl}#program`;
  const lastUpdated = await getCatalogLastUpdated();
  const dateModified = toIsoDateString(lastUpdated);

  const programEntity: Record<string, unknown> = {
    "@type": "EducationalOccupationalProgram",
    "@id": programId,
    url: programUrl,
    name: program.title,
    educationalCredentialAwarded: program.credential,
    description: program.description,
    provider: {
      "@type": "EducationalOrganization",
      name: "Southern New Hampshire University (Referenced Source)",
      sameAs: "https://www.snhu.edu",
    },
  };
  if (program.sourceCatalogUrl) {
    programEntity.isBasedOn = program.sourceCatalogUrl;
  }

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": `${pageUrl}#webpage`,
        url: pageUrl,
        name: buildProgramRequirementsTitle(program),
        description: program.description,
        isPartOf: { "@id": `${baseUrl}/#website` },
        mainEntity: { "@id": programId },
        ...(dateModified ? { dateModified } : {}),
        publisher: {
          "@type": "Organization",
          name: "SNHU Degree Map",
          description: "Unofficial independent project; not affiliated with or endorsed by SNHU.",
          url: baseUrl,
        },
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: baseUrl },
          { "@type": "ListItem", position: 2, name: "Programs", item: `${baseUrl}/programs` },
          {
            "@type": "ListItem",
            position: 3,
            name: program.title,
            item: programUrl,
          },
          {
            "@type": "ListItem",
            position: 4,
            name: "Courses & Requirements",
            item: pageUrl,
          },
        ],
      },
      programEntity,
    ],
  };

  return (
    <div className="mx-auto w-full max-w-[var(--spacing-container-max)] px-4 py-8 md:px-8 space-y-6">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <nav className="flex flex-wrap items-center gap-2 text-xs text-on-surface-variant">
        <Link href="/" className="hover:text-primary hover:underline">
          Home
        </Link>
        <span>/</span>
        <Link href="/programs" className="hover:text-primary hover:underline">
          Programs
        </Link>
        <span>/</span>
        <Link href={`/programs/${program.slug}`} className="hover:text-primary hover:underline">
          {program.title}
        </Link>
        <span>/</span>
        <span className="font-semibold text-on-surface">Courses & Requirements</span>
      </nav>

      <div className="rounded-xl border border-surface-variant bg-surface-container-lowest p-6 shadow-sm space-y-4">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline">{program.degreeLevel}</Badge>
            <span className="inline-flex items-center gap-1 rounded-full bg-surface-container px-2.5 py-0.5 text-xs font-semibold text-on-surface-variant">
              <CalendarIcon className="h-3 w-3" /> Catalog {program.catalogYear}
            </span>
          </div>
          <h1 className="font-[family-name:var(--font-headline)] text-2xl sm:text-3xl font-extrabold tracking-tight text-primary">
            {buildProgramRequirementsTitle(program)}
          </h1>
          <p className="text-sm font-semibold text-on-surface">{program.credential}</p>
          <p className="text-xs sm:text-sm leading-relaxed text-on-surface-variant max-w-4xl">{program.description}</p>
        </div>

        <Link
          href={`/programs/${program.slug}`}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
        >
          <ArrowLeftIcon className="h-3.5 w-3.5" /> Back to interactive degree map
        </Link>
      </div>

      <section className="space-y-4" aria-labelledby="requirement-groups-heading">
        <div>
          <h2 id="requirement-groups-heading" className="text-xl font-bold text-on-surface">
            Requirement Groups
          </h2>
          <p className="text-xs text-on-surface-variant">
            Structured catalog requirement categories, credit thresholds, and nested course rules.
          </p>
        </div>

        <div className="space-y-6">
          {program.groups.map((group) => {
            const instruction = getRequirementInstruction(group);
            return (
              <Card
                key={group.id}
                className="space-y-4 border-l-4"
                style={{ borderLeftColor: group.colorTheme.border }}
              >
                <div className="border-b border-surface-variant pb-3">
                  <h3 className="text-sm font-bold text-on-surface">{group.title}</h3>
                  <p className="mt-1 text-xs font-semibold text-on-surface-variant">
                    {group.totalCredits == null
                      ? "Credits not specified"
                      : `${group.totalCredits} Total Credits`}
                  </p>
                  {group.description && (
                    <p className="mt-1 text-xs text-on-surface-variant">{group.description}</p>
                  )}
                </div>

                {instruction && <p className="text-xs font-semibold text-on-surface-variant">{instruction}</p>}

                {group.sourceText && (
                  <details className="rounded-md bg-surface-container-low p-3 text-xs text-on-surface-variant">
                    <summary className="cursor-pointer font-semibold text-on-surface">
                      Complete catalog rule text
                    </summary>
                    <p className="mt-2 whitespace-pre-wrap leading-relaxed">{group.sourceText}</p>
                  </details>
                )}

                {group.items.length > 0 ? (
                  <RequirementTreeItems items={group.items} />
                ) : (
                  <p className="text-xs italic text-on-surface-variant py-1">
                    No nested requirement items were published for this group.
                  </p>
                )}
              </Card>
            );
          })}
        </div>
      </section>

      <section className="space-y-4 pt-2" aria-labelledby="course-inventory-heading">
        <div>
          <h2 id="course-inventory-heading" className="text-xl font-bold text-on-surface">
            Course Inventory
          </h2>
          <p className="text-xs text-on-surface-variant">
            Known courses in this degree map with credits and prerequisite links from catalog data.
          </p>
        </div>
        <ProgramCourseInventory courses={program.nodes} />
      </section>
    </div>
  );
}

export default async function ProgramRequirementsPage({
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
        <Suspense fallback={<div className="p-8 text-center text-sm text-outline">Loading requirements...</div>}>
          <ProgramRequirementsContent slug={resolvedParams.slug} />
        </Suspense>
      </main>
      <AppFooter lastUpdated={lastUpdated} />
    </div>
  );
}

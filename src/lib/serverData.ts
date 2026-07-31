import "server-only";
import { cache } from "react";
import { unstable_cache } from "next/cache";
import { Pool } from "pg";
import { DegreeProgram } from "@/types/program";
import { fixturePrograms, getProgramBySlug as getFixtureBySlug } from "@/data/fixturePrograms";

let poolInstance: Pool | null = null;

function getDbPool(): Pool | null {
  if (poolInstance) return poolInstance;

  const connectionString = process.env.POSTGRES_URL;
  if (!connectionString) return null;

  try {
    poolInstance = new Pool({
      connectionString,
      ssl: connectionString.includes("localhost") ? false : { rejectUnauthorized: false },
      max: 5,
    });
    return poolInstance;
  } catch {
    return null;
  }
}

async function safeCache<T>(
  cb: () => Promise<T>,
  keyParts: string[],
  options: { tags?: string[]; revalidate?: number }
): Promise<T> {
  try {
    return await unstable_cache(cb, keyParts, options)();
  } catch {
    return await cb();
  }
}

export const getPrograms = cache(
  async (options?: { level?: string; year?: string }): Promise<DegreeProgram[]> => {
    return safeCache(
      async () => {
        const pool = getDbPool();
        if (!pool) return filterFixtures(options);

        try {
          const client = await pool.connect();
          try {
            const res = await client.query<{ slug: string }>("SELECT slug FROM programs ORDER BY title ASC;");
            if (res.rows.length === 0) return filterFixtures(options);

            const fetched: DegreeProgram[] = [];
            for (const row of res.rows) {
              const p = await getProgramBySlug(row.slug);
              if (p) fetched.push(p);
            }
            return filterFixtures(options, fetched.length > 0 ? fetched : fixturePrograms);
          } finally {
            client.release();
          }
        } catch {
          return filterFixtures(options);
        }
      },
      ["get-all-programs", JSON.stringify(options || {})],
      { tags: ["program-data"], revalidate: 3600 }
    );
  }
);

export const getProgramBySlug = cache(
  async (slug: string): Promise<DegreeProgram | null> => {
    return safeCache(
      async () => {
        const pool = getDbPool();
        if (!pool) return getFixtureBySlug(slug) || null;

        try {
          const client = await pool.connect();
          try {
            const progRes = await client.query<DegreeProgram>(
              "SELECT source_pid as \"sourcePid\", slug, title, credential, catalog_year_label as \"catalogYear\", total_credits as \"totalCredits\", description_summary as description, source_url as \"sourceCatalogUrl\" FROM programs WHERE slug = $1 LIMIT 1;",
              [slug]
            );

            if (progRes.rows.length === 0) {
              return getFixtureBySlug(slug) || null;
            }

            const p = progRes.rows[0];
            const fixture = getFixtureBySlug(slug);

            return {
              slug: p.slug,
              title: p.title,
              degreeLevel: (p.credential.includes("Nursing") ? "RN to BSN" : p.credential.includes("Arts") ? "BA" : "BS") as DegreeProgram["degreeLevel"],
              credential: p.credential,
              catalogYear: p.catalogYear || "2025-2026",
              totalCredits: p.totalCredits || 120,
              requiredCourseCount: fixture?.requiredCourseCount || 24,
              electiveCredits: fixture?.electiveCredits || 36,
              estimatedDuration: fixture?.estimatedDuration || "4 Years (8 Semesters)",
              sourceCatalogUrl: p.sourceCatalogUrl || "https://catalog.snhu.edu",
              sourceName: "SNHU Academic Catalog (PostgreSQL Data)",
              description: p.description || fixture?.description || "",
              careerPaths: fixture?.careerPaths,
              groups: fixture?.groups || [],
              nodes: fixture?.nodes || [],
              edges: fixture?.edges || [],
              unparsedRequirements: fixture?.unparsedRequirements,
            };
          } finally {
            client.release();
          }
        } catch {
          return getFixtureBySlug(slug) || null;
        }
      },
      ["get-program-by-slug", slug],
      { tags: ["program-data"], revalidate: 3600 }
    );
  }
);

export const searchPrograms = async (
  query: string,
  options?: { limit?: number; level?: string }
): Promise<Array<{ slug: string; title: string; credential: string; degreeLevel: string; matchedText?: string }>> => {
  const q = query.trim().toLowerCase();
  const limit = options?.limit || 15;

  if (!q) return [];

  const all = await getPrograms();
  const matched = all.filter(
    (p) =>
      p.title.toLowerCase().includes(q) ||
      p.credential.toLowerCase().includes(q) ||
      p.slug.toLowerCase().includes(q) ||
      p.nodes.some((n) => n.code.toLowerCase().includes(q) || n.title.toLowerCase().includes(q))
  );

  return matched.slice(0, limit).map((p) => ({
    slug: p.slug,
    title: p.title,
    credential: p.credential,
    degreeLevel: p.degreeLevel,
    matchedText: p.title,
  }));
};

export const getCatalogYears = cache(async (): Promise<string[]> => {
  return ["2025-2026"];
});

export const getPopularPrograms = cache(async (): Promise<DegreeProgram[]> => {
  const all = await getPrograms();
  return all.slice(0, 3);
});

export const getProgramsForCourse = cache(async (courseCode: string): Promise<DegreeProgram[]> => {
  const all = await getPrograms();
  return all.filter((p) => p.nodes.some((n) => n.code.toLowerCase() === courseCode.toLowerCase()));
});

function filterFixtures(
  options?: { level?: string; year?: string },
  source = fixturePrograms
): DegreeProgram[] {
  return source.filter((p) => {
    if (options?.level && options.level !== "ALL" && p.degreeLevel !== options.level) {
      return false;
    }
    if (options?.year && options.year !== "ALL" && p.catalogYear !== options.year) {
      return false;
    }
    return true;
  });
}

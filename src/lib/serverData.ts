import "server-only";
import { cache } from "react";
import { unstable_cache } from "next/cache";
import { Pool } from "pg";
import { DegreeProgram, CourseNodeData, PrerequisiteEdgeData, RequirementGroup, GroupCategory } from "@/types/program";
import { fixturePrograms, getProgramBySlug as getFixtureBySlug } from "@/data/fixturePrograms";
import { CATEGORY_PALETTES } from "@/lib/graphLayout";

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
          } catch {
            return filterFixtures(options);
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
            const progRes = await client.query<{
              id: string;
              sourcePid: string;
              slug: string;
              title: string;
              credential: string;
              catalogYear: string;
              totalCredits: number;
              description: string;
              sourceCatalogUrl: string;
            }>(
              `
              SELECT
                p.id,
                p.source_pid as "sourcePid",
                p.slug,
                p.title,
                p.credential,
                c.year_label as "catalogYear",
                p.total_credits as "totalCredits",
                p.description_summary as description,
                p.source_url as "sourceCatalogUrl"
              FROM programs p
              JOIN catalogs c ON p.catalog_id = c.id
              WHERE p.slug = $1
              LIMIT 1;
            `,
              [slug]
            );

            if (progRes.rows.length === 0) {
              return getFixtureBySlug(slug) || null;
            }

            const p = progRes.rows[0];

            // Fetch requirement groups from database
            const groupsRes = await client.query<{
              id: string;
              title: string;
              category: string;
              rule_type: string;
              minimum_credits: number | null;
            }>(
              `
              SELECT id, title, category, rule_type, minimum_credits
              FROM program_requirement_groups
              WHERE program_id = $1
              ORDER BY sort_order ASC;
            `,
              [p.id]
            );

            const groups: RequirementGroup[] = [];
            const nodesMap = new Map<string, CourseNodeData>();

            for (const gRow of groupsRes.rows) {
              const cat = (gRow.category as GroupCategory) || "core";
              const palette = CATEGORY_PALETTES[cat] || CATEGORY_PALETTES.core;

              // Fetch courses in group
              const reqCoursesRes = await client.query<{
                id: string;
                source_pid: string | null;
                course_code: string;
                title: string;
                credits: number;
              }>(
                `
                SELECT id, source_pid, course_code, title, credits
                FROM program_requirement_courses
                WHERE requirement_group_id = $1
                ORDER BY sort_order ASC;
              `,
                [gRow.id]
              );

              // Fetch text requirements
              const textReqsRes = await client.query<{ text: string }>(
                `
                SELECT text FROM program_text_requirements
                WHERE requirement_group_id = $1
                ORDER BY sort_order ASC;
              `,
                [gRow.id]
              );

              const items = reqCoursesRes.rows.map((c) => ({
                id: c.id,
                type: "single" as const,
                title: `${c.course_code}: ${c.title}`,
                credits: c.credits,
              }));

              groups.push({
                id: gRow.id,
                title: gRow.title,
                category: cat,
                totalCredits: gRow.minimum_credits || items.reduce((acc, i) => acc + i.credits, 0),
                description: textReqsRes.rows.map((t) => t.text).join("; "),
                items,
                colorTheme: {
                  bg: palette.bg,
                  border: palette.border,
                  text: "text-slate-900",
                  badgeBg: palette.badgeBg,
                  badgeText: palette.badgeText,
                },
              });

              for (const c of reqCoursesRes.rows) {
                if (!nodesMap.has(c.course_code)) {
                  nodesMap.set(c.course_code, {
                    id: c.course_code.replace(/\s+/g, ""),
                    code: c.course_code,
                    title: c.title,
                    credits: c.credits,
                    groupCode: gRow.id,
                    groupName: gRow.title,
                    groupCategory: cat,
                    prerequisites: [],
                  });
                }
              }
            }

            // Fetch course details & prerequisite edges from database
            const edgesRes = await client.query<{
              source_course_code: string;
              target_course_code: string;
              relationship_type: string;
            }>("SELECT source_course_code, target_course_code, relationship_type FROM degree_course_edges;");

            const edges: PrerequisiteEdgeData[] = [];
            for (const eRow of edgesRes.rows) {
              const srcId = eRow.source_course_code.replace(/\s+/g, "");
              const tgtId = eRow.target_course_code.replace(/\s+/g, "");

              // Link prerequisite into node
              const targetNode = nodesMap.get(eRow.target_course_code);
              if (targetNode && !targetNode.prerequisites?.includes(srcId)) {
                targetNode.prerequisites = [...(targetNode.prerequisites || []), srcId];
              }

              edges.push({
                id: `e_${srcId}_${tgtId}`,
                source: srcId,
                target: tgtId,
                type: eRow.relationship_type === "corequisite" ? "corequisite" : "prerequisite",
              });
            }

            const nodes = Array.from(nodesMap.values());
            const fixture = getFixtureBySlug(slug);

            return {
              slug: p.slug,
              title: p.title,
              degreeLevel: (p.credential.includes("Nursing") ? "RN to BSN" : p.credential.includes("Arts") ? "BA" : "BS") as DegreeProgram["degreeLevel"],
              credential: p.credential,
              catalogYear: p.catalogYear || "2025-2026",
              totalCredits: p.totalCredits || 120,
              requiredCourseCount: nodes.length || fixture?.requiredCourseCount || 24,
              electiveCredits: fixture?.electiveCredits || 36,
              estimatedDuration: fixture?.estimatedDuration || "4 Years (8 Semesters)",
              sourceCatalogUrl: p.sourceCatalogUrl || "https://catalog.snhu.edu",
              sourceName: "SNHU Academic Catalog (PostgreSQL Data)",
              description: p.description || fixture?.description || "",
              careerPaths: fixture?.careerPaths,
              groups: groups.length > 0 ? groups : fixture?.groups || [],
              nodes: nodes.length > 0 ? nodes : fixture?.nodes || [],
              edges: edges.length > 0 ? edges : fixture?.edges || [],
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
  const pool = getDbPool();
  if (pool) {
    try {
      const client = await pool.connect();
      try {
        const res = await client.query<{ year_label: string }>("SELECT DISTINCT year_label FROM catalogs;");
        if (res.rows.length > 0) return res.rows.map((r) => r.year_label);
      } finally {
        client.release();
      }
    } catch {
      // fallback
    }
  }
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

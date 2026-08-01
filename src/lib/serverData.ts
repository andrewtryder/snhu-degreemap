import "server-only";
import { cache } from "react";
import { unstable_cache } from "next/cache";
import { Pool } from "pg";
import {
  DegreeProgram,
  CourseNodeData,
  PrerequisiteEdgeData,
  RequirementGroup,
  RequirementItem,
  GroupCategory,
  DegreeLevel,
} from "@/types/program";
import { fixturePrograms, getProgramBySlug as getFixtureBySlug } from "@/data/fixturePrograms";
import { CATEGORY_PALETTES } from "@/lib/graphLayout";
import { normalizeDegreeLevel } from "@/lib/kualiParser";
import { getCourseCodeKey, getCourseNodeId, normalizeCourseCode } from "@/lib/courseCode";

let poolInstance: Pool | null = null;

function getDbPool(): Pool | null {
  const connectionString = process.env.POSTGRES_URL;
  if (!connectionString) {
    poolInstance = null;
    return null;
  }

  if ((process.env.NODE_ENV === "test" || process.env.VITEST) && process.env.TEST_WITH_LIVE_DB !== "true") {
    return null;
  }

  if (poolInstance) return poolInstance;

  try {
    poolInstance = new Pool({
      connectionString,
      ssl: connectionString.includes("localhost") ? false : { rejectUnauthorized: false },
      max: 5,
      connectionTimeoutMillis: 1000,
    });
    return poolInstance;
  } catch {
    return null;
  }
}

function isFixturesEnabled(): boolean {
  if (process.env.NODE_ENV === "test" && process.env.ENABLE_PROGRAM_FIXTURES !== "false") {
    return true;
  }
  return process.env.NODE_ENV !== "production" && process.env.ENABLE_PROGRAM_FIXTURES === "true";
}

async function safeCache<T>(
  cb: () => Promise<T>,
  keyParts: string[],
  options: { tags?: string[] }
): Promise<T> {
  if (process.env.VITEST || process.env.NODE_ENV === "test") {
    return await cb();
  }
  try {
    return await unstable_cache(cb, keyParts, { ...options, revalidate: false })();
  } catch {
    return await cb();
  }
}

export interface ProgramSummary {
  slug: string;
  title: string;
  degreeLevel: DegreeLevel;
  credential: string;
  catalogYear: string;
  totalCredits: number | null;
  requiredCourseCount: number;
  description: string;
  sourceCatalogUrl: string;
}

export const getPrograms = cache(
  async (options?: { level?: string; year?: string }): Promise<DegreeProgram[]> => {
    const pool = getDbPool();
    if (!pool) {
      return isFixturesEnabled() ? filterFixtures(options) : [];
    }

    return safeCache(
      async () => {
        try {
          const client = await pool.connect();
          try {
            const res = await client.query<{
              id: string;
              slug: string;
              title: string;
              credential: string;
              catalogYear: string;
              totalCredits: number | null;
              description: string;
              sourceCatalogUrl: string;
              requiredCourseCount: string;
            }>(
              `
              SELECT
                p.id,
                p.slug,
                p.title,
                p.credential,
                c.year_label as "catalogYear",
                p.total_credits as "totalCredits",
                p.description_summary as description,
                p.source_url as "sourceCatalogUrl",
                (
                  (SELECT COUNT(DISTINCT prc2.course_code)
                   FROM program_requirement_courses prc2
                   JOIN program_requirement_groups prg2 ON prc2.requirement_group_id = prg2.id
                   WHERE prg2.program_id = p.id AND prc2.is_optional = false AND (prg2.rule_type IS NULL OR prg2.rule_type = 'all_of')
                  ) +
                  COALESCE((SELECT SUM(prg3.minimum_selections)
                   FROM program_requirement_groups prg3
                   WHERE prg3.program_id = p.id AND prg3.rule_type = 'choose_n'
                  ), 0)
                )::text as "requiredCourseCount"
              FROM programs p
              JOIN catalogs c ON p.catalog_id = c.id
              ORDER BY p.title ASC;
            `
            );

            if (res.rows.length === 0) {
              if (isFixturesEnabled()) return filterFixtures(options);
              return [];
            }

            const programs: DegreeProgram[] = res.rows.map((row) => ({
              slug: row.slug,
              title: row.title,
              degreeLevel: normalizeDegreeLevel(row.credential),
              credential: row.credential,
              catalogYear: row.catalogYear || "2025-2026",
              totalCredits: row.totalCredits ?? null,
              requiredCourseCount: parseInt(row.requiredCourseCount, 10) || 0,
              electiveCredits: null,
              estimatedDuration: "Not available",
              sourceCatalogUrl: row.sourceCatalogUrl || "https://snhu.kuali.co",
              sourceName: "SNHU Academic Catalog",
              description: row.description || "",
              groups: [],
              nodes: [],
              edges: [],
            }));

            return filterFixtures(options, programs);
          } finally {
            client.release();
          }
        } catch (err) {
          if (isFixturesEnabled()) return filterFixtures(options);
          throw err;
        }
      },
      ["get-all-programs-summaries", JSON.stringify(options || {})],
      { tags: ["program-data"] }
    );
  }
);

export const getProgramBySlug = cache(
  async (slug: string): Promise<DegreeProgram | null> => {
    const pool = getDbPool();
    if (!pool) {
      return isFixturesEnabled() ? getFixtureBySlug(slug) || null : null;
    }

    return safeCache(
      async () => {
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
              totalCredits: number | null;
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
              if (isFixturesEnabled()) return getFixtureBySlug(slug) || null;
              return null;
            }

            const p = progRes.rows[0];

            const groupsRes = await client.query<{
              id: string;
              parent_group_id: string | null;
              title: string;
              category: string;
              rule_type: string;
              minimum_selections: number | null;
              maximum_selections: number | null;
              minimum_credits: number | null;
            }>(
              `
              SELECT id, parent_group_id, title, category, rule_type, minimum_selections, maximum_selections, minimum_credits
              FROM program_requirement_groups
              WHERE program_id = $1
              ORDER BY sort_order ASC;
            `,
              [p.id]
            );

            const nodesMap = new Map<string, CourseNodeData>();
            const unparsedNotes: string[] = [];

            const groupDataMap = new Map<
              string,
              {
                id: string;
                parent_group_id: string | null;
                title: string;
                category: GroupCategory;
                rule_type: string;
                minimum_selections: number | null;
                maximum_selections: number | null;
                minimum_credits: number | null;
                items: RequirementItem[];
              }
            >();

            for (const gRow of groupsRes.rows) {
              const cat = (gRow.category as GroupCategory) || "core";

              const reqCoursesRes = await client.query<{
                id: string;
                source_pid: string | null;
                course_code: string;
                title: string;
                credits: number | null;
                is_optional: boolean;
                resolution_status: CourseNodeData["resolutionStatus"] | null;
              }>(
                `
                SELECT prc.id, prc.source_pid, prc.course_code, prc.title, prc.credits, prc.is_optional,
                       dc.resolution_status
                FROM program_requirement_courses prc
                LEFT JOIN degree_courses dc ON dc.course_code = prc.course_code
                WHERE requirement_group_id = $1
                ORDER BY prc.sort_order ASC;
              `,
                [gRow.id]
              );

              const textReqsRes = await client.query<{ text: string }>(
                `
                SELECT text FROM program_text_requirements
                WHERE requirement_group_id = $1
                ORDER BY sort_order ASC;
              `,
                [gRow.id]
              );

              const items: RequirementItem[] = [];

              for (const c of reqCoursesRes.rows) {
                let itemType: RequirementItem["type"] = "single";
                if (gRow.rule_type === "choose_n" || gRow.rule_type === "choose_credits") {
                  itemType = "choice";
                } else if (gRow.rule_type === "free_elective" || gRow.rule_type === "elective") {
                  itemType = "elective";
                }

                let desc: string | undefined = undefined;
                if (c.is_optional) desc = "Optional Course";

                items.push({
                  id: c.id,
                  type: itemType,
                  title: `${c.course_code}: ${c.title}`,
                  credits: c.credits,
                  description: desc,
                });

                const code = normalizeCourseCode(c.course_code);
                if (!nodesMap.has(code)) {
                  nodesMap.set(code, {
                    id: getCourseNodeId(code),
                    code,
                    title: c.title,
                    credits: c.credits,
                    groupCode: gRow.id,
                    groupName: gRow.title,
                    groupCategory: cat,
                    prerequisites: [],
                    corequisites: [],
                    resolutionStatus: c.resolution_status || "unavailable",
                  });
                }
              }

              for (const t of textReqsRes.rows) {
                items.push({
                  id: `txt_${items.length}`,
                  type: "single",
                  title: t.text,
                  credits: null,
                  isUnparsed: true,
                });
                unparsedNotes.push(t.text);
              }

              groupDataMap.set(gRow.id, {
                id: gRow.id,
                parent_group_id: gRow.parent_group_id,
                title: gRow.title,
                category: cat,
                rule_type: gRow.rule_type,
                minimum_selections: gRow.minimum_selections,
                maximum_selections: gRow.maximum_selections,
                minimum_credits: gRow.minimum_credits,
                items,
              });
            }

            for (const gData of Array.from(groupDataMap.values())) {
              if (gData.parent_group_id && groupDataMap.has(gData.parent_group_id)) {
                const parent = groupDataMap.get(gData.parent_group_id)!;
                parent.items.push({
                  id: gData.id,
                  type: "group",
                  title: gData.title,
                  credits: gData.minimum_credits,
                  subItems: gData.items,
                  ruleType: gData.rule_type,
                  minimumSelections: gData.minimum_selections,
                  maximumSelections: gData.maximum_selections,
                  minimumCredits: gData.minimum_credits,
                });
              }
            }

            const topLevelGroups: RequirementGroup[] = [];
            for (const gData of Array.from(groupDataMap.values())) {
              if (!gData.parent_group_id) {
                const palette = CATEGORY_PALETTES[gData.category] || CATEGORY_PALETTES.core;

                let totalCreds: number | null = gData.minimum_credits;
                if (totalCreds == null && gData.items.length > 0) {
                  let groupSum = 0;
                  let hasUnknown = false;
                  for (const item of gData.items) {
                    if (item.credits == null) {
                      hasUnknown = true;
                      break;
                    }
                    groupSum += item.credits;
                  }
                  totalCreds = !hasUnknown && groupSum > 0 ? groupSum : null;
                }

                topLevelGroups.push({
                  id: gData.id,
                  title: gData.title,
                  category: gData.category,
                  totalCredits: totalCreds,
                  ruleType: gData.rule_type,
                  minimumSelections: gData.minimum_selections,
                  maximumSelections: gData.maximum_selections,
                  minimumCredits: gData.minimum_credits,
                  items: gData.items,
                  colorTheme: {
                    bg: palette.bg,
                    border: palette.border,
                    text: "text-slate-900",
                    badgeBg: palette.badgeBg,
                    badgeText: palette.badgeText,
                  },
                });
              }
            }

            const requiredCourseCount = nodesMap.size;
            const targetNodesArr = Array.from(nodesMap.keys());
            let edgesRes: { rows: Array<{ source_course_code: string; target_course_code: string; relationship_type: string; source_text: string | null; source_title: string | null; source_credits: number | null; source_resolution_status: CourseNodeData["resolutionStatus"] | null }> } = { rows: [] };
            
            if (targetNodesArr.length > 0) {
              edgesRes = await client.query<{
                source_course_code: string;
                target_course_code: string;
                relationship_type: string;
                source_text: string | null;
                source_title: string | null;
                source_credits: number | null;
                source_resolution_status: CourseNodeData["resolutionStatus"] | null;
              }>(
                `
                SELECT e.source_course_code, e.target_course_code, e.relationship_type, e.source_text,
                       c.title as source_title, c.credits as source_credits,
                       c.resolution_status as source_resolution_status
                FROM degree_course_edges e
                LEFT JOIN degree_courses c ON e.source_course_code = c.course_code
                WHERE e.target_course_code = ANY($1::text[])
                `,
                [targetNodesArr]
              );
            }

            const edges: PrerequisiteEdgeData[] = [];
            for (const eRow of edgesRes.rows) {
              const sourceCode = normalizeCourseCode(eRow.source_course_code);
              const targetCode = normalizeCourseCode(eRow.target_course_code);
              const srcId = getCourseNodeId(sourceCode);
              const tgtId = getCourseNodeId(targetCode);

              const targetNode = nodesMap.get(targetCode);
              let sourceNode = nodesMap.get(sourceCode);

              if (targetNode) {
                if (!sourceNode) {
                  sourceNode = {
                    id: srcId,
                    code: sourceCode,
                    title: eRow.source_title || "External Requirement",
                    credits: eRow.source_credits,
                    groupCode: "external",
                    groupName: "External Prerequisites",
                    groupCategory: "other",
                    prerequisites: [],
                    corequisites: [],
                    isExternal: true,
                    resolutionStatus: eRow.source_resolution_status || "unavailable",
                  };
                  nodesMap.set(sourceCode, sourceNode);
                }

                if (eRow.relationship_type === "prerequisite" && !targetNode.prerequisites?.includes(srcId)) {
                  targetNode.prerequisites = [...(targetNode.prerequisites || []), srcId];
                }
                
                if (eRow.relationship_type === "corequisite") {
                  if (!targetNode.corequisites?.includes(srcId)) {
                    targetNode.corequisites = [...(targetNode.corequisites || []), srcId];
                  }
                }

                edges.push({
                  id: `e_${srcId}_${tgtId}_${eRow.relationship_type}`,
                  source: srcId,
                  target: tgtId,
                  type: eRow.relationship_type === "corequisite" ? "corequisite" : "prerequisite",
                  label: eRow.source_text || undefined,
                });
              }
            }

            const nodes = Array.from(nodesMap.values());
            const degreeLevel = normalizeDegreeLevel(p.credential);

            return {
              slug: p.slug,
              title: p.title,
              degreeLevel,
              credential: p.credential,
              catalogYear: p.catalogYear || "2025-2026",
              totalCredits: p.totalCredits ?? null,
              requiredCourseCount,
              electiveCredits: null,
              estimatedDuration: "Not available",
              sourceCatalogUrl: p.sourceCatalogUrl || "https://snhu.kuali.co",
              sourceName: "SNHU Academic Catalog",
              description: p.description || "",
              careerPaths: undefined,
              groups: topLevelGroups,
              nodes,
              edges,
              unparsedRequirements: unparsedNotes.length > 0 ? unparsedNotes : undefined,
            };
          } finally {
            client.release();
          }
        } catch (err) {
          if (isFixturesEnabled()) return getFixtureBySlug(slug) || null;
          throw err;
        }
      },
      ["get-program-by-slug", slug],
      { tags: ["program-data"] }
    );
  }
);

export const searchPrograms = async (
  query: string,
  options?: { limit?: number; level?: string }
): Promise<Array<{ slug: string; title: string; credential: string; degreeLevel: string; matchedText?: string }>> => {
  const q = query.trim();
  const limit = options?.limit ? Math.min(options.limit, 30) : 15;
  const courseCodeKey = getCourseCodeKey(q);

  if (q.length < 2) return [];

  const pool = getDbPool();
  if (!pool) {
    if (!isFixturesEnabled()) return [];
    const all = await getPrograms(options);
    const matched = all.filter(
      (p) =>
        p.title.toLowerCase().includes(q.toLowerCase()) ||
        p.credential.toLowerCase().includes(q.toLowerCase()) ||
        p.slug.toLowerCase().includes(q.toLowerCase())
    );
    return matched.slice(0, limit).map((p) => ({
      slug: p.slug,
      title: p.title,
      credential: p.credential,
      degreeLevel: p.degreeLevel,
      matchedText: p.title,
    }));
  }

  try {
    const client = await pool.connect();
    try {
      const escaped = q.replace(/[%_\\]/g, "\\$&");
      const pattern = `%${escaped}%`;

      let levelFilter = "";
      const queryParams: (string | number)[] = [pattern, courseCodeKey, limit];
      if (options?.level && options.level !== "ALL") {
        queryParams.push(options.level);
        levelFilter = `AND p.credential ILIKE $4`;
      }

      const res = await client.query<{
        slug: string;
        title: string;
        credential: string;
      }>(
        `
        SELECT DISTINCT
          p.slug,
          p.title,
          p.credential
        FROM programs p
        LEFT JOIN program_requirement_groups prg ON prg.program_id = p.id
        LEFT JOIN program_requirement_courses prc ON prc.requirement_group_id = prg.id
        WHERE (
          p.title ILIKE $1 ESCAPE '\\'
          OR p.credential ILIKE $1 ESCAPE '\\'
          OR p.slug ILIKE $1 ESCAPE '\\'
          OR prc.course_code ILIKE $1 ESCAPE '\\'
          OR prc.title ILIKE $1 ESCAPE '\\'
          OR regexp_replace(upper(prc.course_code), '[^A-Z0-9]', '', 'g') = $2
        ) ${levelFilter}
        ORDER BY p.title ASC
        LIMIT $3;
      `,
        queryParams
      );

      return res.rows.map((row) => ({
        slug: row.slug,
        title: row.title,
        credential: row.credential,
        degreeLevel: normalizeDegreeLevel(row.credential),
        matchedText: row.title,
      }));
    } finally {
      client.release();
    }
  } catch (err) {
    if (isFixturesEnabled()) return [];
    throw err;
  }
};

export const getCatalogYears = cache(async (): Promise<string[]> => {
  const pool = getDbPool();
  if (pool) {
    try {
      const client = await pool.connect();
      try {
        const res = await client.query<{ year_label: string }>(
          "SELECT DISTINCT year_label FROM catalogs WHERE is_active = true ORDER BY year_label DESC;"
        );
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
  const code = normalizeCourseCode(courseCode);
  if (!code) return [];
  const pool = getDbPool();
  if (!pool) {
    if (!isFixturesEnabled()) return [];
    const all = await getPrograms();
    return all.filter((p) => p.nodes.some((n) => n.code.toLowerCase() === code.toLowerCase()));
  }

  try {
    const client = await pool.connect();
    try {
      const res = await client.query<{ slug: string }>(
        `
        SELECT DISTINCT p.slug
        FROM programs p
        JOIN program_requirement_groups prg ON prg.program_id = p.id
        JOIN program_requirement_courses prc ON prc.requirement_group_id = prg.id
        WHERE prc.course_code ILIKE $1;
      `,
        [code]
      );

      const fetched: DegreeProgram[] = [];
      for (const row of res.rows) {
        const p = await getProgramBySlug(row.slug);
        if (p) fetched.push(p);
      }
      return fetched;
    } finally {
      client.release();
    }
  } catch (err) {
    if (isFixturesEnabled()) return [];
    throw err;
  }
});

export const getProgramSyncState = cache(async () => {
  const pool = getDbPool();
  if (!pool) return null;

  try {
    const client = await pool.connect();
    try {
      const res = await client.query<{
        status: string;
        last_error: string | null;
        completed_at: Date | null;
        next_due_at: Date | null;
      }>(
        "SELECT status, last_error, completed_at, next_due_at FROM program_sync_state WHERE id = 'program_sync' LIMIT 1"
      );
      if (res.rows.length > 0) return res.rows[0];
      return null;
    } finally {
      client.release();
    }
  } catch {
    return null;
  }
});

/** The latest successful catalog refresh, used for public data freshness messaging. */
export const getCatalogLastUpdated = cache(async (): Promise<Date | null> => {
  const pool = getDbPool();
  if (!pool) return null;

  return safeCache(
    async () => {
      try {
        const client = await pool.connect();
        try {
          const res = await client.query<{ last_updated: Date | null }>(`
            SELECT COALESCE(
              (
                SELECT completed_at
                FROM program_sync_state
                WHERE completed_at IS NOT NULL
                ORDER BY completed_at DESC
                LIMIT 1
              ),
              (SELECT MAX(synced_at) FROM catalogs)
            ) AS last_updated;
          `);
          return res.rows[0]?.last_updated ?? null;
        } finally {
          client.release();
        }
      } catch {
        return null;
      }
    },
    ["catalog-last-updated"],
    { tags: ["program-data"] }
  );
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

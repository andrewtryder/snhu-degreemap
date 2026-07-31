import { PoolClient } from "pg";
import { StagingValidationResult } from "./types";

export async function validateStaging(
  client: PoolClient,
  expectedCount: number,
  failedCount: number,
  allowLargeShrink = false
): Promise<StagingValidationResult> {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check 1: Failed program fetches
  if (failedCount > 0) {
    errors.push(`Staging validation failed: ${failedCount} program detail fetches failed.`);
  }

  // Check 2: Nonzero programs in staging
  const progRes = await client.query<{ count?: string }>("SELECT COUNT(*) as count FROM programs_stage;");
  const programCount = parseInt(progRes?.rows?.[0]?.count || "0", 10);
  if (programCount === 0) {
    errors.push("Staging validation failed: programs_stage table is empty.");
  }

  // Check 3: Material shrink comparison with live data
  const liveProgRes = await client.query<{ count?: string }>("SELECT COUNT(*) as count FROM programs;");
  const liveProgramCount = parseInt(liveProgRes?.rows?.[0]?.count || "0", 10);

  if (liveProgramCount > 0 && !allowLargeShrink) {
    const shrinkRatio = (liveProgramCount - programCount) / liveProgramCount;
    if (shrinkRatio > 0.2) {
      errors.push(
        `Staging validation failed: Material shrink detected! Live count=${liveProgramCount}, Staging count=${programCount} (${(
          shrinkRatio * 100
        ).toFixed(1)}% shrink). Pass allowLargeShrink=true to override.`
      );
    }
  }

  // Check 4: Duplicate program slugs in staging
  const dupSlugRes = await client.query<{ slug: string; count: string }>(`
    SELECT slug, COUNT(*) as count FROM programs_stage GROUP BY slug HAVING COUNT(*) > 1;
  `);
  if (dupSlugRes?.rows && dupSlugRes.rows.length > 0) {
    errors.push(
      `Staging validation failed: Duplicate program slugs found in staging: ${dupSlugRes.rows
        .map((r) => r.slug)
        .join(", ")}`
    );
  }

  // Check 5: Orphaned requirement groups in staging
  const orphanGroupsRes = await client.query<{ count?: string }>(`
    SELECT COUNT(*) as count FROM program_requirement_groups_stage
    WHERE program_id NOT IN (SELECT id FROM programs_stage);
  `);
  const orphanGroupCount = parseInt(orphanGroupsRes?.rows?.[0]?.count || "0", 10);
  if (orphanGroupCount > 0) {
    errors.push(`Staging validation failed: ${orphanGroupCount} requirement groups in staging do not belong to valid programs.`);
  }

  // Check 6: Orphaned requirement courses in staging
  const orphanCoursesRes = await client.query<{ count?: string }>(`
    SELECT COUNT(*) as count FROM program_requirement_courses_stage
    WHERE requirement_group_id NOT IN (SELECT id FROM program_requirement_groups_stage);
  `);
  const orphanCourseCount = parseInt(orphanCoursesRes?.rows?.[0]?.count || "0", 10);
  if (orphanCourseCount > 0) {
    errors.push(`Staging validation failed: ${orphanCourseCount} requirement courses in staging do not belong to valid groups.`);
  }

  // Check 7: Child requirement groups with invalid parents
  const orphanChildGroupsRes = await client.query<{ count?: string }>(`
    SELECT COUNT(*) as count FROM program_requirement_groups_stage
    WHERE parent_group_id IS NOT NULL
      AND parent_group_id NOT IN (SELECT id FROM program_requirement_groups_stage);
  `);
  const orphanChildGroupCount = parseInt(orphanChildGroupsRes?.rows?.[0]?.count || "0", 10);
  if (orphanChildGroupCount > 0) {
    errors.push(`Staging validation failed: ${orphanChildGroupCount} child requirement groups have invalid parent group references.`);
  }

  // Check 8: Programs without requirement groups or courses
  const emptyProgRes = await client.query<{ slug: string }>(`
    SELECT p.slug FROM programs_stage p
    LEFT JOIN program_requirement_groups_stage g ON g.program_id = p.id
    WHERE g.id IS NULL AND p.warning_count = 0;
  `);
  if (emptyProgRes?.rows && emptyProgRes.rows.length > 0) {
    warnings.push(`Staging warning: ${emptyProgRes.rows.length} staged programs have zero requirement groups and no warning notes.`);
  }

  // Check 9: Courses and edges count
  const courseRes = await client.query<{ count?: string }>("SELECT COUNT(*) as count FROM degree_courses_stage;");
  const courseCount = parseInt(courseRes?.rows?.[0]?.count || "0", 10);

  const edgeRes = await client.query<{ count?: string }>("SELECT COUNT(*) as count FROM degree_course_edges_stage;");
  const edgeCount = parseInt(edgeRes?.rows?.[0]?.count || "0", 10);

  const valid = errors.length === 0;

  return {
    valid,
    programCount,
    liveProgramCount,
    courseCount,
    edgeCount,
    errors,
    warnings,
  };
}

export async function promoteStagingToLive(client: PoolClient): Promise<void> {
  try {
    await client.query("BEGIN;");

    // Atomically replace live tables from staging tables within one single transaction
    await client.query(
      "TRUNCATE TABLE programs, program_requirement_groups, program_requirement_courses, program_text_requirements, degree_courses, degree_course_edges CASCADE;"
    );

    await client.query("INSERT INTO programs SELECT * FROM programs_stage;");
    await client.query("INSERT INTO program_requirement_groups SELECT * FROM program_requirement_groups_stage;");
    await client.query("INSERT INTO program_requirement_courses SELECT * FROM program_requirement_courses_stage;");
    await client.query("INSERT INTO program_text_requirements SELECT * FROM program_text_requirements_stage;");
    await client.query("INSERT INTO degree_courses SELECT * FROM degree_courses_stage;");
    await client.query("INSERT INTO degree_course_edges SELECT * FROM degree_course_edges_stage;");

    await client.query("COMMIT;");
  } catch (err) {
    await client.query("ROLLBACK;");
    throw err;
  }
}

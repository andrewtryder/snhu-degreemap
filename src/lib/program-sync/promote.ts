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

  // Check 2: Program count in staging
  const progRes = await client.query<{ count: string }>("SELECT COUNT(*) FROM programs_stage;");
  const programCount = parseInt(progRes.rows[0].count, 10);

  if (programCount === 0) {
    errors.push("Staging validation failed: programs_stage table is empty.");
  }

  if (expectedCount > 0 && programCount !== expectedCount) {
    errors.push(
      `Staging validation failed: program count in staging (${programCount}) does not match expected count (${expectedCount}).`
    );
  }

  // Check 3: Material shrink comparison with live data
  const liveProgRes = await client.query<{ count: string }>("SELECT COUNT(*) FROM programs;");
  const liveProgramCount = parseInt(liveProgRes.rows[0].count, 10);

  if (liveProgramCount > 0 && !allowLargeShrink) {
    const shrinkRatio = (liveProgramCount - programCount) / liveProgramCount;
    if (shrinkRatio > 0.2) {
      errors.push(
        `Staging validation failed: Material shrink detected! Live count=${liveProgramCount}, Staging count=${programCount} (${(
          shrinkRatio * 100
        ).toFixed(1)}% shrink). Pass --allow-large-shrink to override.`
      );
    }
  }

  // Check 4: Duplicate slugs in staging
  const dupSlugRes = await client.query<{ slug: string; count: string }>(`
    SELECT slug, COUNT(*) as count FROM programs_stage GROUP BY slug HAVING COUNT(*) > 1;
  `);

  if (dupSlugRes.rows.length > 0) {
    errors.push(
      `Staging validation failed: Duplicate program slugs found in staging: ${dupSlugRes.rows
        .map((r) => r.slug)
        .join(", ")}`
    );
  }

  // Check 5: Courses & edges counts
  const courseRes = await client.query<{ count: string }>("SELECT COUNT(*) FROM degree_courses_stage;");
  const courseCount = parseInt(courseRes.rows[0].count, 10);

  const edgeRes = await client.query<{ count: string }>("SELECT COUNT(*) FROM degree_course_edges_stage;");
  const edgeCount = parseInt(edgeRes.rows[0].count, 10);

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
  // Atomically replace live tables from staging tables
  await client.query("TRUNCATE TABLE programs CASCADE;");
  await client.query("INSERT INTO programs SELECT * FROM programs_stage;");

  await client.query("TRUNCATE TABLE program_requirement_groups CASCADE;");
  await client.query("INSERT INTO program_requirement_groups SELECT * FROM program_requirement_groups_stage;");

  await client.query("TRUNCATE TABLE program_requirement_courses CASCADE;");
  await client.query("INSERT INTO program_requirement_courses SELECT * FROM program_requirement_courses_stage;");

  await client.query("TRUNCATE TABLE program_text_requirements CASCADE;");
  await client.query("INSERT INTO program_text_requirements SELECT * FROM program_text_requirements_stage;");

  await client.query("TRUNCATE TABLE degree_courses CASCADE;");
  await client.query("INSERT INTO degree_courses SELECT * FROM degree_courses_stage;");

  await client.query("TRUNCATE TABLE degree_course_edges CASCADE;");
  await client.query("INSERT INTO degree_course_edges SELECT * FROM degree_course_edges_stage;");
}

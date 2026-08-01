import { PoolClient } from "pg";
import { CatalogProgram, RequirementGroupDomain, PrerequisiteEdgeDomain } from "@/types/domainCatalog";
import { NormalizedCourseDetails } from "@/lib/kualiCourseParser";
import { normalizeCourseCode } from "@/lib/courseCode";

export async function persistProgramToStaging(
  client: PoolClient,
  program: CatalogProgram,
  catalogDbId: string
): Promise<void> {
  const programDbId = `prog_${program.sourcePid}`;
  const totalCredits = typeof program.totalCredits === "number" ? program.totalCredits : null;

  await client.query(
    `
    INSERT INTO programs_stage (
      id, catalog_id, source_pid, slug, title, credential, total_credits,
      description_summary, source_url, source_hash, warning_count, synced_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())
    ON CONFLICT (catalog_id, source_pid) DO UPDATE SET
      slug = EXCLUDED.slug,
      title = EXCLUDED.title,
      credential = EXCLUDED.credential,
      total_credits = EXCLUDED.total_credits,
      description_summary = EXCLUDED.description_summary,
      source_url = EXCLUDED.source_url,
      source_hash = EXCLUDED.source_hash,
      warning_count = EXCLUDED.warning_count,
      synced_at = NOW();
  `,
    [
      programDbId,
      catalogDbId,
      program.sourcePid,
      program.slug,
      program.title,
      program.credential,
      totalCredits,
      program.descriptionSummary,
      program.sourceUrl,
      program.sourceHash,
      (program.warnings || []).length,
    ]
  );

  // Recursively persist requirement groups
  let sortOrder = 0;
  for (const group of program.requirementGroups) {
    await persistGroupToStaging(client, programDbId, null, group, sortOrder++);
  }
}

async function persistGroupToStaging(
  client: PoolClient,
  programDbId: string,
  parentGroupId: string | null,
  group: RequirementGroupDomain,
  sortOrder: number
): Promise<void> {
  const groupId = `grp_${programDbId}_${group.stableSourcePath.replace(/[^a-zA-Z0-9_]/g, "_")}`;

  await client.query(
    `
    INSERT INTO program_requirement_groups_stage (
      id, program_id, parent_group_id, source_path, title, category,
      rule_type, minimum_selections, maximum_selections, minimum_credits,
      sort_order, warning_count, raw_excerpt, rule_metadata
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14::jsonb)
    ON CONFLICT (program_id, source_path) DO UPDATE SET
      title = EXCLUDED.title,
      category = EXCLUDED.category,
      rule_type = EXCLUDED.rule_type,
      minimum_selections = EXCLUDED.minimum_selections,
      maximum_selections = EXCLUDED.maximum_selections,
      minimum_credits = EXCLUDED.minimum_credits,
      sort_order = EXCLUDED.sort_order,
      parent_group_id = EXCLUDED.parent_group_id,
      warning_count = EXCLUDED.warning_count,
      raw_excerpt = EXCLUDED.raw_excerpt,
      rule_metadata = EXCLUDED.rule_metadata;
  `,
    [
      groupId,
      programDbId,
      parentGroupId,
      group.stableSourcePath,
      group.title,
      group.category,
      group.ruleType,
      group.minimumSelections || null,
      group.maximumSelections || null,
      group.minimumCredits || null,
      sortOrder,
      (group.warnings || []).length,
      group.rawText || null,
      JSON.stringify(group.ruleMetadata || {}),
    ]
  );

  // Persist course requirements
  let cOrder = 0;
  for (const cr of group.courseRequirements) {
    const crId = `cr_${groupId}_${cOrder}`;
    const credits = typeof cr.credits === "number" ? cr.credits : null;
    await client.query(
      `
      INSERT INTO program_requirement_courses_stage (
        id, requirement_group_id, source_path, source_pid, course_code, title, credits, is_optional, sort_order
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9);
    `,
      [
        crId,
        groupId,
        cr.sourcePath,
        cr.sourcePid || null,
        cr.courseCode,
        cr.title,
        credits,
        Boolean(cr.optional),
        cOrder++,
      ]
    );
  }

  // Persist text requirements
  let tOrder = 0;
  for (const txt of group.textRequirements) {
    const txtId = `txt_${groupId}_${tOrder}`;
    await client.query(
      `
      INSERT INTO program_text_requirements_stage (
        id, requirement_group_id, source_path, text, sort_order, is_unparsed
      ) VALUES ($1, $2, $3, $4, $5, $6);
    `,
      [txtId, groupId, `${group.stableSourcePath}.text[${tOrder}]`, txt, tOrder++, false]
    );
  }

  // Child groups
  let childOrder = 0;
  for (const child of group.children) {
    await persistGroupToStaging(client, programDbId, groupId, child, childOrder++);
  }
}

export async function persistCoursesToStaging(
  client: PoolClient,
  courses: NormalizedCourseDetails[]
): Promise<void> {
  for (const course of courses) {
    const courseCode = normalizeCourseCode(course.code);
    const credits = typeof course.credits === "number" ? course.credits : null;
    await client.query(
      `
      INSERT INTO degree_courses_stage (
        course_code, source_pid, title, credits, subject_code, source_hash, resolution_status, synced_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
      ON CONFLICT (course_code) DO UPDATE SET
        title = EXCLUDED.title,
        credits = EXCLUDED.credits,
        source_pid = EXCLUDED.source_pid,
        resolution_status = EXCLUDED.resolution_status,
        synced_at = NOW();
    `,
      [
        courseCode,
        course.pid,
        course.title,
        credits,
        courseCode.split(" ")[0] || "GEN",
        course.pid,
        course.resolutionStatus || "resolved",
      ]
    );
  }
}

export async function persistEdgesToStaging(
  client: PoolClient,
  edges: PrerequisiteEdgeDomain[]
): Promise<void> {
  for (const edge of edges) {
    await client.query(
      `
      INSERT INTO degree_course_edges_stage (
        source_course_code, target_course_code, relationship_type, source_text
      ) VALUES ($1, $2, $3, $4)
      ON CONFLICT (source_course_code, target_course_code, relationship_type) DO NOTHING;
    `,
      [edge.source, edge.target, edge.type, edge.label || null]
    );
  }
}

import dotenv from "dotenv";
import { Pool } from "pg";

dotenv.config();

export async function runMigrations(connectionString?: string) {
  const url = connectionString || process.env.POSTGRES_URL;

  if (!url) {
    console.error("[Migration Error] POSTGRES_URL environment variable is required.");
    process.exit(1);
  }

  const pool = new Pool({
    connectionString: url,
    ssl: url.includes("localhost") ? false : { rejectUnauthorized: false },
  });

  const client = await pool.connect();

  try {
    console.log("[Migration] Beginning PostgreSQL database migration...");

    await client.query("BEGIN;");

    // 1. Catalogs Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS catalogs (
        id TEXT PRIMARY KEY,
        external_catalog_id TEXT NOT NULL,
        title TEXT NOT NULL,
        year_label TEXT NOT NULL,
        source_url TEXT,
        is_active BOOLEAN DEFAULT true,
        synced_at TIMESTAMPTZ
      );
    `);

    // 2. Programs Table (Live & Staging)
    await client.query(`
      CREATE TABLE IF NOT EXISTS programs (
        id TEXT PRIMARY KEY,
        catalog_id TEXT REFERENCES catalogs(id),
        source_pid TEXT NOT NULL,
        slug TEXT NOT NULL,
        title TEXT NOT NULL,
        credential TEXT NOT NULL,
        total_credits INTEGER,
        description_summary TEXT,
        source_url TEXT,
        source_hash TEXT,
        warning_count INTEGER DEFAULT 0,
        synced_at TIMESTAMPTZ,
        UNIQUE(catalog_id, source_pid),
        UNIQUE(catalog_id, slug)
      );

      CREATE TABLE IF NOT EXISTS programs_stage (
        id TEXT PRIMARY KEY,
        catalog_id TEXT REFERENCES catalogs(id),
        source_pid TEXT NOT NULL,
        slug TEXT NOT NULL,
        title TEXT NOT NULL,
        credential TEXT NOT NULL,
        total_credits INTEGER,
        description_summary TEXT,
        source_url TEXT,
        source_hash TEXT,
        warning_count INTEGER DEFAULT 0,
        synced_at TIMESTAMPTZ,
        UNIQUE(catalog_id, source_pid),
        UNIQUE(catalog_id, slug)
      );
    `);

    // 3. Requirement Groups Table (Live & Staging)
    await client.query(`
      CREATE TABLE IF NOT EXISTS program_requirement_groups (
        id TEXT PRIMARY KEY,
        program_id TEXT REFERENCES programs(id) ON DELETE CASCADE,
        parent_group_id TEXT REFERENCES program_requirement_groups(id) ON DELETE CASCADE,
        source_path TEXT NOT NULL,
        title TEXT NOT NULL,
        category TEXT NOT NULL,
        rule_type TEXT NOT NULL,
        minimum_selections INTEGER,
        maximum_selections INTEGER,
        minimum_credits INTEGER,
        sort_order INTEGER NOT NULL DEFAULT 0,
        warning_count INTEGER DEFAULT 0,
        raw_excerpt TEXT,
        UNIQUE(program_id, source_path)
      );

      CREATE TABLE IF NOT EXISTS program_requirement_groups_stage (
        id TEXT PRIMARY KEY,
        program_id TEXT REFERENCES programs_stage(id) ON DELETE CASCADE,
        parent_group_id TEXT REFERENCES program_requirement_groups_stage(id) ON DELETE CASCADE,
        source_path TEXT NOT NULL,
        title TEXT NOT NULL,
        category TEXT NOT NULL,
        rule_type TEXT NOT NULL,
        minimum_selections INTEGER,
        maximum_selections INTEGER,
        minimum_credits INTEGER,
        sort_order INTEGER NOT NULL DEFAULT 0,
        warning_count INTEGER DEFAULT 0,
        raw_excerpt TEXT,
        UNIQUE(program_id, source_path)
      );
    `);

    // 4. Requirement Courses Table (Live & Staging)
    await client.query(`
      CREATE TABLE IF NOT EXISTS program_requirement_courses (
        id TEXT PRIMARY KEY,
        requirement_group_id TEXT REFERENCES program_requirement_groups(id) ON DELETE CASCADE,
        source_path TEXT NOT NULL,
        source_pid TEXT,
        course_code TEXT NOT NULL,
        title TEXT NOT NULL,
        credits INTEGER,
        is_optional BOOLEAN DEFAULT false,
        sort_order INTEGER NOT NULL DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS program_requirement_courses_stage (
        id TEXT PRIMARY KEY,
        requirement_group_id TEXT REFERENCES program_requirement_groups_stage(id) ON DELETE CASCADE,
        source_path TEXT NOT NULL,
        source_pid TEXT,
        course_code TEXT NOT NULL,
        title TEXT NOT NULL,
        credits INTEGER,
        is_optional BOOLEAN DEFAULT false,
        sort_order INTEGER NOT NULL DEFAULT 0
      );
    `);

    // 5. Text Requirements Table (Live & Staging)
    await client.query(`
      CREATE TABLE IF NOT EXISTS program_text_requirements (
        id TEXT PRIMARY KEY,
        requirement_group_id TEXT REFERENCES program_requirement_groups(id) ON DELETE CASCADE,
        source_path TEXT NOT NULL,
        text TEXT NOT NULL,
        sort_order INTEGER NOT NULL DEFAULT 0,
        is_unparsed BOOLEAN DEFAULT false
      );

      CREATE TABLE IF NOT EXISTS program_text_requirements_stage (
        id TEXT PRIMARY KEY,
        requirement_group_id TEXT REFERENCES program_requirement_groups_stage(id) ON DELETE CASCADE,
        source_path TEXT NOT NULL,
        text TEXT NOT NULL,
        sort_order INTEGER NOT NULL DEFAULT 0,
        is_unparsed BOOLEAN DEFAULT false
      );
    `);

    // 6. Degree Courses Table (Live & Staging)
    await client.query(`
      CREATE TABLE IF NOT EXISTS degree_courses (
        course_code TEXT PRIMARY KEY,
        source_pid TEXT,
        title TEXT NOT NULL,
        credits INTEGER,
        subject_code TEXT,
        source_hash TEXT,
        synced_at TIMESTAMPTZ
      );

      CREATE TABLE IF NOT EXISTS degree_courses_stage (
        course_code TEXT PRIMARY KEY,
        source_pid TEXT,
        title TEXT NOT NULL,
        credits INTEGER,
        subject_code TEXT,
        source_hash TEXT,
        synced_at TIMESTAMPTZ
      );
    `);

    // 7. Degree Course Edges Table (Live & Staging)
    await client.query(`
      CREATE TABLE IF NOT EXISTS degree_course_edges (
        source_course_code TEXT NOT NULL,
        target_course_code TEXT NOT NULL,
        relationship_type TEXT NOT NULL,
        source_text TEXT,
        PRIMARY KEY (source_course_code, target_course_code, relationship_type)
      );

      CREATE TABLE IF NOT EXISTS degree_course_edges_stage (
        source_course_code TEXT NOT NULL,
        target_course_code TEXT NOT NULL,
        relationship_type TEXT NOT NULL,
        source_text TEXT,
        PRIMARY KEY (source_course_code, target_course_code, relationship_type)
      );
    `);

    // 8. Sync State Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS program_sync_state (
        id TEXT PRIMARY KEY,
        status TEXT NOT NULL DEFAULT 'awaiting_bootstrap',
        sync_id UUID,
        cursor INTEGER NOT NULL DEFAULT 0,
        expected_count INTEGER,
        imported_count INTEGER NOT NULL DEFAULT 0,
        skipped_count INTEGER NOT NULL DEFAULT 0,
        failed_count INTEGER NOT NULL DEFAULT 0,
        started_at TIMESTAMPTZ,
        completed_at TIMESTAMPTZ,
        next_due_at TIMESTAMPTZ,
        lease_expires_at TIMESTAMPTZ,
        last_error TEXT
      );
    `);

    // Additive columns for backwards compatibility
    await client.query(`
      ALTER TABLE program_sync_state ADD COLUMN IF NOT EXISTS sync_id UUID;
      ALTER TABLE program_sync_state ADD COLUMN IF NOT EXISTS failed_count INTEGER NOT NULL DEFAULT 0;
      ALTER TABLE program_sync_state ADD COLUMN IF NOT EXISTS skipped_count INTEGER NOT NULL DEFAULT 0;

      ALTER TABLE programs ALTER COLUMN total_credits DROP NOT NULL;
      ALTER TABLE programs ALTER COLUMN total_credits DROP DEFAULT;
      ALTER TABLE programs_stage ALTER COLUMN total_credits DROP NOT NULL;
      ALTER TABLE programs_stage ALTER COLUMN total_credits DROP DEFAULT;

      ALTER TABLE program_requirement_courses ALTER COLUMN credits DROP NOT NULL;
      ALTER TABLE program_requirement_courses ALTER COLUMN credits DROP DEFAULT;
      ALTER TABLE program_requirement_courses_stage ALTER COLUMN credits DROP NOT NULL;
      ALTER TABLE program_requirement_courses_stage ALTER COLUMN credits DROP DEFAULT;

      ALTER TABLE degree_courses ALTER COLUMN credits DROP NOT NULL;
      ALTER TABLE degree_courses ALTER COLUMN credits DROP DEFAULT;
      ALTER TABLE degree_courses_stage ALTER COLUMN credits DROP NOT NULL;
      ALTER TABLE degree_courses_stage ALTER COLUMN credits DROP DEFAULT;

      ALTER TABLE program_sync_items ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';
      ALTER TABLE program_sync_items ADD COLUMN IF NOT EXISTS reason TEXT;
      ALTER TABLE program_sync_items ADD COLUMN IF NOT EXISTS processed_at TIMESTAMPTZ;
    `);

    // 9. Sync Items Snapshot Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS program_sync_items (
        sync_id UUID NOT NULL,
        ordinal INTEGER NOT NULL,
        source_pid TEXT NOT NULL,
        status TEXT DEFAULT 'pending',
        reason TEXT,
        processed_at TIMESTAMPTZ,
        PRIMARY KEY (sync_id, ordinal),
        UNIQUE (sync_id, source_pid)
      );
    `);

    // Initialize sync state row if absent
    await client.query(`
      INSERT INTO program_sync_state (id, status, cursor, imported_count, skipped_count, failed_count)
      VALUES ('program_sync', 'awaiting_bootstrap', 0, 0, 0, 0)
      ON CONFLICT (id) DO NOTHING;
    `);

    // Indexes for fast lookup
    await client.query(`
      CREATE INDEX IF NOT EXISTS programs_slug_idx ON programs (slug);
      CREATE INDEX IF NOT EXISTS programs_stage_slug_idx ON programs_stage (slug);
      CREATE INDEX IF NOT EXISTS programs_title_idx ON programs (title);
      CREATE INDEX IF NOT EXISTS program_req_courses_code_idx ON program_requirement_courses (course_code);
      CREATE INDEX IF NOT EXISTS program_req_courses_title_idx ON program_requirement_courses (title);
      CREATE INDEX IF NOT EXISTS program_req_courses_group_idx ON program_requirement_courses (requirement_group_id);
      CREATE INDEX IF NOT EXISTS program_req_groups_prog_idx ON program_requirement_groups (program_id);
      CREATE INDEX IF NOT EXISTS degree_edges_source_idx ON degree_course_edges (source_course_code);
      CREATE INDEX IF NOT EXISTS degree_edges_target_idx ON degree_course_edges (target_course_code);
    `);

    await client.query("COMMIT;");
    console.log("[Migration] Database schema migrations completed successfully.");
  } catch (error) {
    await client.query("ROLLBACK;");
    console.error("[Migration Error] Migration failed:", error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

if (require.main === module) {
  runMigrations().catch(() => process.exit(1));
}

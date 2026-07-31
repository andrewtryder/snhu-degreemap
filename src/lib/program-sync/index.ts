import { randomUUID } from "node:crypto";
import { getDbPool } from "./database";
import { fetchKualiProgramList, fetchKualiProgramDetail, fetchKualiCourseDetail } from "./fetch";
import { parseProgramPayload, parseCoursePayload, extractCourseReferences, generatePrerequisiteEdges } from "./parse";
import { persistProgramToStaging, persistCoursesToStaging, persistEdgesToStaging } from "./persist";
import { validateStaging, promoteStagingToLive } from "./promote";
import { SyncResult, SyncOptions, ProgramSyncState } from "./types";
import { kualiConfig } from "@/config/kualiConfig";

export async function runProgramSync(options: SyncOptions = {}): Promise<SyncResult> {
  const catalogId = options.catalogId || kualiConfig.catalogId;
  const batchSize = options.batchSize || 10;
  const maxConcurrency = options.maxConcurrency || 3;
  const syncId = randomUUID();

  try {
    const pool = getDbPool();
    const client = await pool.connect();

    try {
      // 1. Inspect lease and current sync state
      const stateRes = await client.query<ProgramSyncState>(
        "SELECT * FROM program_sync_state WHERE id = 'program_sync' FOR UPDATE;"
      );

      const state = stateRes.rows[0];

      if (state && state.status === "in_progress" && !options.ignoreLease) {
        const leaseExpired = state.lease_expires_at && new Date() > new Date(state.lease_expires_at);
        if (!leaseExpired) {
          return {
            action: "skipped",
            status: "in_progress",
            cursor: state.cursor,
            importedCount: state.imported_count,
            failedCount: state.failed_count,
            message: "Sync currently in progress by another lease owner",
          };
        }
      }

      // 2. Acquire Lease & Update sync_state
      const leaseExpiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minute lease
      await client.query(
        `
        UPDATE program_sync_state
        SET status = 'in_progress', sync_id = $1, started_at = NOW(),
            lease_expires_at = $2, last_error = NULL
        WHERE id = 'program_sync';
      `,
        [syncId, leaseExpiresAt]
      );

      // Ensure catalog entry exists
      const catalogDbId = `cat_${catalogId}`;
      await client.query(
        `
        INSERT INTO catalogs (id, external_catalog_id, title, year_label, source_url, is_active, synced_at)
        VALUES ($1, $2, 'SNHU Academic Catalog', '2025-2026', $3, true, NOW())
        ON CONFLICT (id) DO NOTHING;
      `,
        [catalogDbId, catalogId, `${kualiConfig.baseUrl}/api/v1/catalog/programs/${catalogId}`]
      );

      // 3. Fetch program list & Snapshot PIDs
      console.log(`[Program Sync] Fetching program list for catalog ${catalogId}...`);
      const rawProgramList = await fetchKualiProgramList(catalogId);
      const uniquePids = Array.from(new Set(rawProgramList.map((p) => p.pid).filter((pid): pid is string => Boolean(pid))));

      console.log(`[Program Sync] Discovered ${uniquePids.length} programs in Kuali catalog.`);

      // Clear old staging tables
      await client.query("TRUNCATE TABLE programs_stage CASCADE;");
      await client.query("TRUNCATE TABLE degree_courses_stage CASCADE;");

      // Save sync items snapshot
      await client.query("DELETE FROM program_sync_items WHERE sync_id = $1;", [syncId]);
      for (let i = 0; i < uniquePids.length; i++) {
        await client.query(
          "INSERT INTO program_sync_items (sync_id, ordinal, source_pid) VALUES ($1, $2, $3);",
          [syncId, i, uniquePids[i]]
        );
      }

      await client.query(
        "UPDATE program_sync_state SET expected_count = $1, cursor = 0, imported_count = 0, failed_count = 0 WHERE id = 'program_sync';",
        [uniquePids.length]
      );

      // 4. Batch process program details
      let importedCount = 0;
      let failedCount = 0;
      const referencedCoursesMap = new Map<string, { code: string; pid?: string }>();

      for (let i = 0; i < uniquePids.length; i += batchSize) {
        const batchPids = uniquePids.slice(i, i + batchSize);

        const batchResults = await Promise.all(
          batchPids.map(async (pid) => {
            try {
              const rawDetail = await fetchKualiProgramDetail(pid, catalogId);
              if (!rawDetail) return { pid, success: false, error: "Not found" };
              const program = parseProgramPayload(rawDetail, catalogId);
              return { pid, success: true, program };
            } catch (err) {
              return { pid, success: false, error: (err as Error).message };
            }
          })
        );

        for (const res of batchResults) {
          if (res.success && res.program) {
            await persistProgramToStaging(client, res.program, catalogDbId);
            importedCount++;

            // Collect course references
            const refs = extractCourseReferences(res.program);
            for (const ref of refs) {
              if (!referencedCoursesMap.has(ref.code)) {
                referencedCoursesMap.set(ref.code, ref);
              }
            }
          } else {
            failedCount++;
            console.warn(`[Program Sync Warning] Failed to fetch/parse PID ${res.pid}: ${res.error}`);
          }
        }

        const currentCursor = i + batchPids.length;
        await client.query(
          "UPDATE program_sync_state SET cursor = $1, imported_count = $2, failed_count = $3 WHERE id = 'program_sync';",
          [currentCursor, importedCount, failedCount]
        );
      }

      // 5. Fetch referenced course details & edges
      console.log(`[Program Sync] Processing ${referencedCoursesMap.size} unique referenced courses...`);
      const courseRefs = Array.from(referencedCoursesMap.values());
      const parsedCourses = [];

      for (let i = 0; i < courseRefs.length; i += maxConcurrency) {
        const chunk = courseRefs.slice(i, i + maxConcurrency);
        const chunkResults = await Promise.all(
          chunk.map(async (ref) => {
            if (ref.pid) {
              try {
                const rawCourse = await fetchKualiCourseDetail(ref.pid, catalogId);
                if (rawCourse) {
                  return parseCoursePayload(rawCourse);
                }
              } catch {
                // fallback below
              }
            }
            return {
              pid: ref.pid || ref.code,
              code: ref.code,
              title: ref.code,
              credits: 3,
              description: "",
              prerequisites: [],
              corequisites: [],
            };
          })
        );
        parsedCourses.push(...chunkResults);
      }

      // Persist courses and edges to staging
      await persistCoursesToStaging(client, parsedCourses);
      const edges = generatePrerequisiteEdges(parsedCourses);
      await persistEdgesToStaging(client, edges);

      // 6. Validate Staging Database
      console.log(`[Program Sync] Validating staging tables before promotion...`);
      const validation = await validateStaging(
        client,
        uniquePids.length,
        failedCount,
        options.allowLargeShrink
      );

      if (!validation.valid) {
        const errorMsg = `Staging validation failed: ${validation.errors.join("; ")}`;
        await client.query(
          "UPDATE program_sync_state SET status = 'error', last_error = $1 WHERE id = 'program_sync';",
          [errorMsg]
        );
        return {
          action: "error",
          syncId,
          status: "error",
          cursor: uniquePids.length,
          expectedCount: uniquePids.length,
          importedCount,
          failedCount,
          promoted: false,
          error: errorMsg,
        };
      }

      // 7. Atomic Promotion to Live Database
      console.log(`[Program Sync] Promoting staging tables to live database...`);
      await promoteStagingToLive(client);

      const nextDue = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
      await client.query(
        `
        UPDATE program_sync_state
        SET status = 'idle', completed_at = NOW(), next_due_at = $1,
            lease_expires_at = NULL, last_error = NULL
        WHERE id = 'program_sync';
      `,
        [nextDue]
      );

      console.log(`[Program Sync] Synchronization and atomic promotion completed successfully!`);

      return {
        action: "promoted",
        syncId,
        status: "idle",
        cursor: uniquePids.length,
        expectedCount: uniquePids.length,
        importedCount,
        failedCount,
        promoted: true,
        message: `Successfully synchronized and promoted ${importedCount} programs and ${parsedCourses.length} courses to live database.`,
      };
    } finally {
      client.release();
    }
  } catch (err: unknown) {
    const errorMsg = (err as Error).message;
    console.error("[Program Sync Error]", errorMsg);

    try {
      const pool = getDbPool();
      await pool.query(
        "UPDATE program_sync_state SET status = 'error', last_error = $1 WHERE id = 'program_sync';",
        [errorMsg]
      );
    } catch {
      // ignore secondary error
    }

    return {
      action: "error",
      status: "error",
      cursor: 0,
      importedCount: 0,
      failedCount: 0,
      promoted: false,
      error: errorMsg,
    };
  }
}

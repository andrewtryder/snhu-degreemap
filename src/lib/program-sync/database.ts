import { Client } from "pg";
import dotenv from "dotenv";
import { createPgClient, withDirectClient } from "@/lib/db/client";

dotenv.config();

function requireConnectionString(): string {
  const connectionString = process.env.POSTGRES_URL;
  if (!connectionString) {
    throw new Error("POSTGRES_URL environment variable is missing");
  }
  return connectionString;
}

export async function withSyncClient<T>(callback: (client: Client) => Promise<T>): Promise<T> {
  const client = createPgClient(requireConnectionString());
  await client.connect();

  try {
    return await callback(client);
  } finally {
    await client.end();
  }
}

export async function withTransaction<T>(callback: (client: Client) => Promise<T>): Promise<T> {
  return withSyncClient(async (client) => {
    await client.query("BEGIN;");
    try {
      const result = await callback(client);
      await client.query("COMMIT;");
      return result;
    } catch (err) {
      await client.query("ROLLBACK;");
      throw err;
    }
  });
}

export async function withProgramSyncConnection<T>(
  callback: (client: Client) => Promise<T>
): Promise<T> {
  return withSyncClient(callback);
}

export async function recordProgramSyncError(syncId: string, errorMsg: string): Promise<void> {
  try {
    await withDirectClient(async (client) => {
      await client.query(
        "UPDATE program_sync_state SET status = 'error', last_error = $1 WHERE id = 'program_sync' AND sync_id = $2;",
        [errorMsg, syncId]
      );
    });
  } catch {
    // ignore secondary error
  }
}

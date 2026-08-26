import { Client, type ClientConfig } from "pg";
import { resolvePgConnectionConfig } from "./ssl";

export function createPgClientConfig(connectionString: string): ClientConfig {
  const { connectionString: cleanedConnectionString, ssl } =
    resolvePgConnectionConfig(connectionString);

  return {
    connectionString: cleanedConnectionString,
    ssl,
  };
}

export function createPgClient(connectionString: string): Client {
  return new Client(createPgClientConfig(connectionString));
}

function getConnectionString(): string {
  const connectionString = process.env.POSTGRES_URL;
  if (!connectionString) {
    throw new Error("POSTGRES_URL is required");
  }
  return connectionString;
}

export async function withDirectClient<T>(fn: (client: Client) => Promise<T>): Promise<T> {
  const client = createPgClient(getConnectionString());
  await client.connect();

  try {
    return await fn(client);
  } finally {
    await client.end();
  }
}

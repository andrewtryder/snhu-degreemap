import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const connectMock = vi.hoisted(() => vi.fn());
const endMock = vi.hoisted(() => vi.fn());
const queryMock = vi.hoisted(() => vi.fn());
const clientConstructorMock = vi.hoisted(() =>
  vi.fn(function MockClient(this: {
    connect: typeof connectMock;
    end: typeof endMock;
    query: typeof queryMock;
  }) {
    this.connect = connectMock;
    this.end = endMock;
    this.query = queryMock;
  })
);

vi.mock("pg", () => ({
  Client: clientConstructorMock,
}));

vi.mock("../ssl", () => ({
  resolvePgConnectionConfig: vi.fn(() => ({
    connectionString: "postgresql://user:pass@host:5432/db",
    ssl: { rejectUnauthorized: true, ca: "test-ca" },
  })),
}));

describe("withDirectClient", () => {
  const originalPostgresUrl = process.env.POSTGRES_URL;

  beforeEach(() => {
    vi.resetModules();
    clientConstructorMock.mockClear();
    connectMock.mockReset();
    endMock.mockReset();
    queryMock.mockReset();
    process.env.POSTGRES_URL = "postgresql://user:pass@host:5432/db";
  });

  afterEach(() => {
    if (originalPostgresUrl === undefined) {
      delete process.env.POSTGRES_URL;
    } else {
      process.env.POSTGRES_URL = originalPostgresUrl;
    }
  });

  it("connects, runs the callback, and ends the client", async () => {
    connectMock.mockResolvedValue(undefined);
    endMock.mockResolvedValue(undefined);
    queryMock.mockResolvedValue({ rows: [{ ok: true }] });

    const { withDirectClient } = await import("../client");
    const result = await withDirectClient(async (client) => client.query("SELECT 1"));

    expect(clientConstructorMock).toHaveBeenCalledWith({
      connectionString: "postgresql://user:pass@host:5432/db",
      ssl: { rejectUnauthorized: true, ca: "test-ca" },
    });
    expect(connectMock).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ rows: [{ ok: true }] });
    expect(endMock).toHaveBeenCalledTimes(1);
  });
});

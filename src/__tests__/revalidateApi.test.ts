import { describe, it, expect, vi, beforeEach } from "vitest";
import { dynamic, POST } from "@/app/api/revalidate/route";

vi.mock("next/cache", () => ({
  revalidateTag: vi.fn(),
}));

describe("POST /api/revalidate Endpoint", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  it("runs dynamically so the deployed secret is read at request time", () => {
    expect(dynamic).toBe("force-dynamic");
  });

  it("fails 500 when REVALIDATE_SECRET is missing from environment", async () => {
    delete process.env.REVALIDATE_SECRET;

    const request = new Request("http://localhost/api/revalidate", {
      method: "POST",
      headers: { Authorization: "Bearer test-secret" },
    });

    const response = await POST(request);
    expect(response.status).toBe(500);

    const json = await response.json();
    expect(json.error).toContain("REVALIDATE_SECRET is missing");
  });

  it("fails 401 unauthorized when Bearer secret token is invalid or missing", async () => {
    process.env.REVALIDATE_SECRET = "correct-secret-123";

    const request1 = new Request("http://localhost/api/revalidate", { method: "POST" });
    const response1 = await POST(request1);
    expect(response1.status).toBe(401);

    const request2 = new Request("http://localhost/api/revalidate", {
      method: "POST",
      headers: { Authorization: "Bearer wrong-secret" },
    });
    const response2 = await POST(request2);
    expect(response2.status).toBe(401);
  });

  it("succeeds 200 and revalidates program-data tag with correct secret", async () => {
    process.env.REVALIDATE_SECRET = "correct-secret-123";

    const request = new Request("http://localhost/api/revalidate", {
      method: "POST",
      headers: { Authorization: "Bearer correct-secret-123" },
    });

    const response = await POST(request);
    expect(response.status).toBe(200);

    const json = await response.json();
    expect(json.revalidated).toBe(true);
    expect(json.tag).toBe("program-data");
  });
});

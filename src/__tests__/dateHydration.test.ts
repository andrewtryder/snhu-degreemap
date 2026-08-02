import { describe, expect, it } from "vitest";
import { toIsoDateString } from "@/lib/serverData";

describe("toIsoDateString", () => {
  it("accepts Date instances", () => {
    expect(toIsoDateString(new Date("2026-08-01T03:33:52.233Z"))).toBe("2026-08-01T03:33:52.233Z");
  });

  it("accepts ISO strings from cache deserialization", () => {
    expect(toIsoDateString("2026-08-01T03:33:52.233Z")).toBe("2026-08-01T03:33:52.233Z");
  });

  it("returns undefined for null/invalid values", () => {
    expect(toIsoDateString(null)).toBeUndefined();
    expect(toIsoDateString("not-a-date")).toBeUndefined();
  });
});

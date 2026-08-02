import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { getSiteUrl, PRODUCTION_SITE_URL } from "@/lib/siteUrl";

describe("getSiteUrl", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.NEXT_PUBLIC_SITE_URL;
    delete process.env.SITE_URL;
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("falls back to the production site URL", () => {
    expect(getSiteUrl()).toBe(PRODUCTION_SITE_URL);
  });

  it("prefers configured production URL and strips trailing slashes", () => {
    process.env.NEXT_PUBLIC_SITE_URL = "https://snhu-degreemap.vercel.app/";
    expect(getSiteUrl()).toBe("https://snhu-degreemap.vercel.app");
  });

  it("rejects Vercel preview deployment hosts", () => {
    process.env.NEXT_PUBLIC_SITE_URL = "https://snhu-degreemap-7jluzupnl-andrewtryder.vercel.app";
    expect(getSiteUrl()).toBe(PRODUCTION_SITE_URL);
  });

  it("accepts a custom non-preview production host", () => {
    process.env.NEXT_PUBLIC_SITE_URL = "https://degreemap.example.com/";
    expect(getSiteUrl()).toBe("https://degreemap.example.com");
  });
});

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import robots from "@/app/robots";
import sitemap from "@/app/sitemap";
import { generateMetadata } from "@/app/programs/[slug]/page";
import { generateMetadata as generateProgramsMetadata } from "@/app/programs/page";
import { PRODUCTION_SITE_URL } from "@/lib/siteUrl";

describe("SEO, Metadata & Sitemap Generation", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.NEXT_PUBLIC_SITE_URL;
    delete process.env.SITE_URL;
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("generates production robots.txt rules", () => {
    process.env.VERCEL_ENV = "production";
    const r = robots();
    expect(r.rules).toEqual({
      userAgent: "*",
      allow: "/",
      disallow: "/api/",
    });
    expect(r.sitemap).toBe(`${PRODUCTION_SITE_URL}/sitemap.xml`);
  });

  it("disallows all crawling on non-production deployments", () => {
    process.env.VERCEL_ENV = "preview";
    const r = robots();
    expect(r.rules).toEqual({
      userAgent: "*",
      disallow: "/",
    });
    expect(r.sitemap).toBeUndefined();
  });

  it("generates sitemap entries for static, program, and requirements routes", async () => {
    const entries = await sitemap();
    const urls = entries.map((e) => e.url);

    expect(urls).toContain(PRODUCTION_SITE_URL);
    expect(urls).toContain(`${PRODUCTION_SITE_URL}/programs`);
    expect(urls).toContain(`${PRODUCTION_SITE_URL}/about`);
    expect(urls).toContain(`${PRODUCTION_SITE_URL}/programs/computer-science-bs`);
    expect(urls).toContain(`${PRODUCTION_SITE_URL}/programs/computer-science-bs/requirements`);

    expect(urls.some((u) => u.includes("/data-status"))).toBe(false);
    expect(urls.some((u) => u.includes("/methodology"))).toBe(false);
    expect(urls.some((u) => u.includes("/api/"))).toBe(false);
    expect(urls.some((u) => u.includes("?level="))).toBe(false);
    expect(entries.every((e) => !(e.lastModified instanceof Date && Number.isNaN(e.lastModified.getTime())))).toBe(
      true,
    );
  });

  it("generates tightened page metadata for program detail route", async () => {
    const params = Promise.resolve({ slug: "computer-science-bs" });
    const meta = await generateMetadata({ params });

    expect(meta.title).toBe("Computer Science BS Degree Map");
    expect(meta.description).toContain("Unofficial");
    expect(meta.description).toContain("2025-2026");
    expect(meta.alternates?.canonical).toBe(`${PRODUCTION_SITE_URL}/programs/computer-science-bs`);
  });

  it("canonicalizes directory filter variants to /programs", async () => {
    const meta = await generateProgramsMetadata({
      searchParams: Promise.resolve({ level: "bachelor" }),
    });
    expect(meta.alternates?.canonical).toBe("/programs");
  });
});

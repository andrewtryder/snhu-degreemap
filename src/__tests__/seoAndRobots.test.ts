import { describe, it, expect, beforeEach, afterEach } from "vitest";
import robots from "@/app/robots";
import sitemap from "@/app/sitemap";
import { generateMetadata } from "@/app/programs/[slug]/page";

describe("SEO, Metadata & Sitemap Generation", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
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
    expect(r.sitemap).toBe("https://snhu-degreemap.vercel.app/sitemap.xml");
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

    expect(urls).toContain("https://snhu-degreemap.vercel.app");
    expect(urls).toContain("https://snhu-degreemap.vercel.app/programs");
    expect(urls).toContain("https://snhu-degreemap.vercel.app/about");
    expect(urls).toContain("https://snhu-degreemap.vercel.app/programs/computer-science-bs");
    expect(urls).toContain("https://snhu-degreemap.vercel.app/programs/computer-science-bs/requirements");

    expect(urls.some((u) => u.includes("/data-status"))).toBe(false);
    expect(urls.some((u) => u.includes("/methodology"))).toBe(false);
    expect(urls.some((u) => u.includes("/api/"))).toBe(false);
    expect(urls.some((u) => u.includes("?level="))).toBe(false);
  });

  it("generates dynamic page metadata for program detail route", async () => {
    const params = Promise.resolve({ slug: "computer-science-bs" });
    const meta = await generateMetadata({ params });

    expect(meta.title).toContain("Computer Science");
    expect(meta.title).toContain("SNHU");
    expect(meta.description).toContain("Computer Science");
    expect(meta.alternates?.canonical).toContain("/programs/computer-science-bs");
  });
});

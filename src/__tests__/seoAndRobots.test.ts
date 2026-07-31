import { describe, it, expect } from "vitest";
import robots from "@/app/robots";
import sitemap from "@/app/sitemap";
import { generateMetadata } from "@/app/programs/[slug]/page";

describe("SEO, Metadata & Sitemap Generation", () => {
  it("generates correct robots.txt rules", () => {
    const r = robots();
    expect(r.rules).toBeDefined();
    expect(r.rules).toHaveProperty("allow");
    expect(r.rules).toHaveProperty("disallow");
    expect(r.sitemap).toContain("/sitemap.xml");
  });

  it("generates sitemap entries for static and program routes", async () => {
    const entries = await sitemap();
    expect(entries.length).toBeGreaterThan(0);
    expect(entries.some((e) => e.url.endsWith("/programs"))).toBe(true);
    expect(entries.some((e) => e.url.endsWith("/programs/computer-science-bs"))).toBe(true);
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

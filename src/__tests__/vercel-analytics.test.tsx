import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

describe("Vercel Analytics Integration", () => {
  it("includes @vercel/analytics in production dependencies", () => {
    const pkgPath = path.join(process.cwd(), "package.json");
    const pkgContent = fs.readFileSync(pkgPath, "utf-8");
    const pkg = JSON.parse(pkgContent);

    expect(pkg.dependencies).toHaveProperty("@vercel/analytics");
    expect(pkg.devDependencies || {}).not.toHaveProperty("@vercel/analytics");
  });

  it("integrates Analytics exactly once in the root layout with the correct import", () => {
    const layoutPath = path.join(process.cwd(), "src/app/layout.tsx");
    const layoutContent = fs.readFileSync(layoutPath, "utf-8");

    // Check correct import
    expect(layoutContent).toContain('import { Analytics } from "@vercel/analytics/next"');

    // Check it's not a client component
    expect(layoutContent).not.toContain('"use client"');
    expect(layoutContent).not.toContain("'use client'");

    // Check exact usage of <Analytics /> inside layout
    const analyticsMatches = layoutContent.match(/<Analytics\s*\/>/g);
    expect(analyticsMatches).not.toBeNull();
    expect(analyticsMatches?.length).toBe(1);
  });

  it("does not contain duplicate Analytics integration in individual pages", () => {
    const pagesDir = path.join(process.cwd(), "src/app");

    // Find all page.tsx files recursively
    const findPages = (dir: string, fileList: string[] = []) => {
      const files = fs.readdirSync(dir);
      for (const file of files) {
        const filePath = path.join(dir, file);
        if (fs.statSync(filePath).isDirectory()) {
          findPages(filePath, fileList);
        } else if (file === "page.tsx") {
          fileList.push(filePath);
        }
      }
      return fileList;
    };

    const pages = findPages(pagesDir);
    for (const page of pages) {
      const content = fs.readFileSync(page, "utf-8");
      expect(content, `Page ${page} should not contain Analytics`).not.toContain("<Analytics");
      expect(content, `Page ${page} should not import Analytics`).not.toContain("@vercel/analytics");
    }
  });
});

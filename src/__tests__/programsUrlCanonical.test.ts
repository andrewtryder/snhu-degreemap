import { describe, expect, it } from "vitest";
import { resolveProgramsRedirect } from "@/lib/programsUrlCanonical";

function params(query: string): URLSearchParams {
  return new URLSearchParams(query);
}

describe("resolveProgramsRedirect", () => {
  it("returns null for clean /programs", () => {
    expect(resolveProgramsRedirect("/programs", params(""))).toBeNull();
  });

  it("ignores non-/programs paths", () => {
    expect(resolveProgramsRedirect("/programs/bachelors", params("level=bachelor"))).toBeNull();
    expect(resolveProgramsRedirect("/about", params("sort=name"))).toBeNull();
  });

  it("redirects valid level filters to permanent category routes", () => {
    expect(resolveProgramsRedirect("/programs", params("level=bachelor"))).toBe("/programs/bachelors");
    expect(resolveProgramsRedirect("/programs", params("level=graduate"))).toBe("/programs/graduate");
    expect(resolveProgramsRedirect("/programs", params("level=associate"))).toBe("/programs/associate");
    expect(resolveProgramsRedirect("/programs", params("level=certificate"))).toBe(
      "/programs/certificates",
    );
  });

  it("strips sort and search query variants to /programs", () => {
    expect(resolveProgramsRedirect("/programs", params("sort=name"))).toBe("/programs");
    expect(resolveProgramsRedirect("/programs", params("search=computer"))).toBe("/programs");
  });

  it("prefers category redirect when level is combined with other filters", () => {
    expect(resolveProgramsRedirect("/programs", params("level=bachelor&sort=name"))).toBe(
      "/programs/bachelors",
    );
    expect(resolveProgramsRedirect("/programs", params("search=cs&level=graduate"))).toBe(
      "/programs/graduate",
    );
  });

  it("strips invalid level values to /programs", () => {
    expect(resolveProgramsRedirect("/programs", params("level=doctoral"))).toBe("/programs");
    expect(resolveProgramsRedirect("/programs", params("level="))).toBe("/programs");
  });
});

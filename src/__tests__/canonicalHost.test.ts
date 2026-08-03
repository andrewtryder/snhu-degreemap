import { describe, expect, it } from "vitest";
import { resolveCanonicalHostRedirect } from "@/lib/canonicalHost";

const PREFERRED = "https://degreemap.example.com";

describe("resolveCanonicalHostRedirect", () => {
  it("skips non-production deployments", () => {
    expect(
      resolveCanonicalHostRedirect({
        host: "snhu-degreemap.vercel.app",
        proto: "https",
        pathname: "/",
        search: "",
        isProduction: false,
        preferredOrigin: PREFERRED,
      }),
    ).toBeNull();
  });

  it("returns null when host and scheme already match preferred", () => {
    expect(
      resolveCanonicalHostRedirect({
        host: "degreemap.example.com",
        proto: "https",
        pathname: "/programs",
        search: "",
        isProduction: true,
        preferredOrigin: PREFERRED,
      }),
    ).toBeNull();
  });

  it("redirects www to the preferred apex host", () => {
    expect(
      resolveCanonicalHostRedirect({
        host: "www.degreemap.example.com",
        proto: "https",
        pathname: "/programs",
        search: "",
        isProduction: true,
        preferredOrigin: PREFERRED,
      }),
    ).toBe("https://degreemap.example.com/programs");
  });

  it("redirects the production vercel.app host once a custom domain is preferred", () => {
    expect(
      resolveCanonicalHostRedirect({
        host: "snhu-degreemap.vercel.app",
        proto: "https",
        pathname: "/programs/bachelors",
        search: "",
        isProduction: true,
        preferredOrigin: PREFERRED,
      }),
    ).toBe("https://degreemap.example.com/programs/bachelors");
  });

  it("forces HTTPS when proto is http", () => {
    expect(
      resolveCanonicalHostRedirect({
        host: "degreemap.example.com",
        proto: "http",
        pathname: "/about",
        search: "",
        isProduction: true,
        preferredOrigin: PREFERRED,
      }),
    ).toBe("https://degreemap.example.com/about");
  });

  it("preserves pathname and search on host redirects", () => {
    expect(
      resolveCanonicalHostRedirect({
        host: "www.degreemap.example.com",
        proto: "https",
        pathname: "/programs",
        search: "?level=bachelor",
        isProduction: true,
        preferredOrigin: PREFERRED,
      }),
    ).toBe("https://degreemap.example.com/programs?level=bachelor");
  });

  it("is a no-op when preferred origin is still the vercel production host", () => {
    expect(
      resolveCanonicalHostRedirect({
        host: "snhu-degreemap.vercel.app",
        proto: "https",
        pathname: "/",
        search: "",
        isProduction: true,
        preferredOrigin: "https://snhu-degreemap.vercel.app",
      }),
    ).toBeNull();
  });
});

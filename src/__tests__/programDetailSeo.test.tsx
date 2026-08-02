import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ProgramDetailContent } from "@/app/programs/[slug]/page";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
  notFound: () => {
    throw new Error("NEXT_NOT_FOUND");
  },
}));

vi.mock("@/components/graph/DynamicDegreeMapGraph", () => ({
  DynamicDegreeMapGraph: () => <div data-testid="dynamic-degree-map">map</div>,
}));

describe("program detail SEO content", () => {
  it("includes enriched JSON-LD and related program links", async () => {
    const element = await ProgramDetailContent({ slug: "computer-science-bs" });
    const { container } = render(element);

    const jsonLdScript = container.querySelector('script[type="application/ld+json"]');
    expect(jsonLdScript).toBeTruthy();
    const jsonLd = JSON.parse(jsonLdScript!.textContent || "{}");
    const graph = jsonLd["@graph"] as Array<Record<string, unknown>>;

    const webPage = graph.find((node) => node["@type"] === "WebPage");
    const program = graph.find((node) => node["@type"] === "EducationalOccupationalProgram");

    expect(webPage?.mainEntity).toEqual({ "@id": expect.stringContaining("#program") });
    expect(webPage?.url).toContain("/programs/computer-science-bs");
    expect(program?.isBasedOn).toContain("academic-catalogs#/programs/V1S14E8tg/none");
    expect(program?.url).toContain("/programs/computer-science-bs");

    expect(await screen.findByTestId("dynamic-degree-map")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /Related .* Programs/i })).toBeInTheDocument();

    const relatedLinks = screen.getAllByRole("link").filter((link) => {
      const href = link.getAttribute("href") || "";
      return href.startsWith("/programs/") && href !== "/programs/computer-science-bs";
    });
    expect(relatedLinks.length).toBeGreaterThan(0);
    expect(relatedLinks.every((link) => link.getAttribute("href") !== "/programs/computer-science-bs")).toBe(true);
  }, 15000);
});

import { MetadataRoute } from "next";
import { getCatalogLastUpdated, getSitemapPrograms } from "@/lib/serverData";
import { PROGRAM_LEVEL_PATHS } from "@/lib/programLevelCategories";
import { getSiteUrl } from "@/lib/siteUrl";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = getSiteUrl();
  const catalogUpdated = await getCatalogLastUpdated();
  const staticLastModified = catalogUpdated ?? undefined;

  const categoryRoutes: MetadataRoute.Sitemap = PROGRAM_LEVEL_PATHS.map((entry) => ({
    url: `${baseUrl}/programs/${entry.path}`,
    lastModified: staticLastModified,
    changeFrequency: "weekly" as const,
    priority: 0.85,
  }));

  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: staticLastModified,
      changeFrequency: "weekly",
      priority: 1.0,
    },
    {
      url: `${baseUrl}/programs`,
      lastModified: staticLastModified,
      changeFrequency: "weekly",
      priority: 0.9,
    },
    ...categoryRoutes,
    {
      url: `${baseUrl}/about`,
      lastModified: staticLastModified,
      changeFrequency: "monthly",
      priority: 0.5,
    },
  ];

  try {
    const programs = await getSitemapPrograms();
    const programRoutes: MetadataRoute.Sitemap = programs.flatMap((program) => {
      const lastModified = program.updatedAt ?? catalogUpdated ?? undefined;
      return [
        {
          url: `${baseUrl}/programs/${program.slug}`,
          lastModified,
          changeFrequency: "weekly" as const,
          priority: 0.8,
        },
        {
          url: `${baseUrl}/programs/${program.slug}/requirements`,
          lastModified,
          changeFrequency: "weekly" as const,
          priority: 0.75,
        },
      ];
    });

    return [...staticRoutes, ...programRoutes];
  } catch {
    // DB failure: return verified static routes only. Do not invent empty program success.
    return staticRoutes;
  }
}

import { MetadataRoute } from "next";
import { getPrograms } from "@/lib/serverData";
import { siteConfig } from "@/lib/site";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = siteConfig.url.replace(/\/$/, "");

  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1.0,
    },
    {
      url: `${baseUrl}/programs`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: `${baseUrl}/about`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.5,
    },
  ];

  try {
    const programs = await getPrograms();
    const programRoutes: MetadataRoute.Sitemap = programs.flatMap((p) => [
      {
        url: `${baseUrl}/programs/${p.slug}`,
        lastModified: new Date(),
        changeFrequency: "weekly" as const,
        priority: 0.8,
      },
      {
        url: `${baseUrl}/programs/${p.slug}/requirements`,
        lastModified: new Date(),
        changeFrequency: "weekly" as const,
        priority: 0.75,
      },
    ]);

    return [...staticRoutes, ...programRoutes];
  } catch {
    return staticRoutes;
  }
}

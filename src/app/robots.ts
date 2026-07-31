import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL || "https://snhu-degreemap.vercel.app";

  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/programs", "/programs/*", "/about", "/methodology", "/data-status"],
      disallow: ["/api/*"],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}

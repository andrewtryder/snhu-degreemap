import { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/siteUrl";
import { isIndexableDeployment } from "@/lib/deploymentEnv";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = getSiteUrl();

  if (!isIndexableDeployment()) {
    return {
      rules: {
        userAgent: "*",
        disallow: "/",
      },
    };
  }

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: "/api/",
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}

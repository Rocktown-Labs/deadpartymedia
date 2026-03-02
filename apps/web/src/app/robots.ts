import type { MetadataRoute } from "next";
import { getSiteDefaults } from "@/lib/seo";

const DISALLOWED_PATHS = ["/admin/", "/api/", "/artist-dashboard/", "/dashboard/"];

export default function robots(): MetadataRoute.Robots {
  const { siteUrl } = getSiteDefaults();

  return {
    host: siteUrl,
    rules: [
      {
        allow: "/",
        disallow: DISALLOWED_PATHS,
        userAgent: "*",
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}

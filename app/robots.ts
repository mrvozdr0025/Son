import type { MetadataRoute } from "next"
import { getBaseUrl } from "@/lib/seo"

export default function robots(): MetadataRoute.Robots {
  const base = getBaseUrl()
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/admin",
          "/admin/*",
          "/api/",
          "/api/*",
          "/bildirimler",
          "/yeni-konu",
          "/ayarlar",
          "/mesajlar",
          "/kaydedilenler",
        ],
      },
      {
        userAgent: "Googlebot",
        allow: "/",
        disallow: [
          "/admin",
          "/admin/*",
          "/api/",
          "/api/*",
          "/bildirimler",
          "/yeni-konu",
          "/ayarlar",
        ],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
  }
}

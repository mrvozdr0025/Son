import type { MetadataRoute } from "next"
import { db } from "@/lib/db"
import { categories, profiles, tags, topics } from "@/lib/db/schema"
import { getBaseUrl } from "@/lib/seo"
import { desc, eq } from "drizzle-orm"

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = getBaseUrl()

  const [cats, latestTopics, allTags, activeProfiles] = await Promise.all([
    db.select({ slug: categories.slug }).from(categories),
    db
      .select({ slug: topics.slug, lastActivityAt: topics.lastActivityAt })
      .from(topics)
      .orderBy(desc(topics.lastActivityAt))
      .limit(500),
    db.select({ slug: tags.slug }).from(tags).limit(200),
    db
      .select({ username: profiles.username, createdAt: profiles.createdAt })
      .from(profiles)
      .orderBy(desc(profiles.xp))
      .limit(100),
  ])

  return [
    { url: base, changeFrequency: "hourly", priority: 1.0 },
    { url: `${base}/bulten`, changeFrequency: "daily", priority: 0.8 },
    { url: `${base}/liderler`, changeFrequency: "daily", priority: 0.7 },
    { url: `${base}/arena`, changeFrequency: "weekly", priority: 0.6 },
    { url: `${base}/oyun`, changeFrequency: "weekly", priority: 0.6 },
    { url: `${base}/sohbet`, changeFrequency: "weekly", priority: 0.6 },
    { url: `${base}/gorevler`, changeFrequency: "daily", priority: 0.5 },
    ...cats.map((c) => ({
      url: `${base}/kategori/${c.slug}`,
      changeFrequency: "hourly" as const,
      priority: 0.8,
    })),
    ...latestTopics.map((t) => ({
      url: `${base}/konu/${t.slug}`,
      lastModified: t.lastActivityAt,
      changeFrequency: "daily" as const,
      priority: 0.7,
    })),
    ...activeProfiles.map((p) => ({
      url: `${base}/profil/${p.username}`,
      lastModified: p.createdAt,
      changeFrequency: "weekly" as const,
      priority: 0.6,
    })),
    ...allTags.map((t) => ({
      url: `${base}/etiket/${t.slug}`,
      changeFrequency: "daily" as const,
      priority: 0.5,
    })),
  ]
}

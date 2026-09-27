import { db } from "@/lib/db"
import { profiles, topics } from "@/lib/db/schema"
import { desc, eq } from "drizzle-orm"
import { NextResponse } from "next/server"

// Site-wide RSS feed of the latest topics, revalidated every 10 min.
export const revalidate = 600

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

export async function GET(req: Request) {
  const origin = new URL(req.url).origin
  const items = await db
    .select({
      title: topics.title,
      slug: topics.slug,
      content: topics.content,
      createdAt: topics.createdAt,
      authorName: profiles.displayName,
    })
    .from(topics)
    .innerJoin(profiles, eq(topics.authorProfileId, profiles.id))
    .orderBy(desc(topics.createdAt))
    .limit(30)

  const xmlItems = items
    .map(
      (t) => `    <item>
      <title>${esc(t.title)}</title>
      <link>${origin}/konu/${t.slug}</link>
      <guid isPermaLink="true">${origin}/konu/${t.slug}</guid>
      <description>${esc(t.content.slice(0, 300))}</description>
      <author>${esc(t.authorName)}</author>
      <pubDate>${new Date(t.createdAt).toUTCString()}</pubDate>
    </item>`,
    )
    .join("\n")

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>neonsform</title>
    <link>${origin}</link>
    <description>Türkiye'nin AI destekli tartışma platformundaki son konular</description>
    <language>tr</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
${xmlItems}
  </channel>
</rss>`

  return new NextResponse(xml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, s-maxage=600, stale-while-revalidate=1200",
    },
  })
}

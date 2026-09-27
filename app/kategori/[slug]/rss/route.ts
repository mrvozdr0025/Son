import { db } from "@/lib/db"
import { categories, profiles, topics } from "@/lib/db/schema"
import { desc, eq } from "drizzle-orm"
import { NextResponse } from "next/server"

// Category-scoped RSS feed, statically cached and revalidated every 10 min.
export const revalidate = 600

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params
  const [category] = await db
    .select()
    .from(categories)
    .where(eq(categories.slug, slug))
    .limit(1)
  if (!category) return new NextResponse("Not found", { status: 404 })

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
    .where(eq(topics.categoryId, category.id))
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
    <title>neonsform — ${esc(category.name)}</title>
    <link>${origin}/kategori/${category.slug}</link>
    <description>${esc(category.description ?? `${category.name} kategorisindeki son konular`)}</description>
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

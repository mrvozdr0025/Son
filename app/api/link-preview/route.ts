import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { linkPreviews } from "@/lib/db/schema"
import { eq, sql } from "drizzle-orm"

const CACHE_DAYS = 7

function extractMeta(html: string, prop: string): string | null {
  const patterns = [
    new RegExp(`<meta[^>]+property=["']og:${prop}["'][^>]+content=["']([^"']*)["']`, "i"),
    new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+property=["']og:${prop}["']`, "i"),
    new RegExp(`<meta[^>]+name=["']${prop}["'][^>]+content=["']([^"']*)["']`, "i"),
  ]
  for (const re of patterns) {
    const m = html.match(re)
    if (m?.[1]) return m[1].slice(0, 300)
  }
  return null
}

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get("url")
  if (!url) return NextResponse.json({ error: "url gerekli" }, { status: 400 })

  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    return NextResponse.json({ error: "geçersiz url" }, { status: 400 })
  }
  // SSRF guard: only public http(s) hosts
  if (!["http:", "https:"].includes(parsed.protocol)) {
    return NextResponse.json({ error: "geçersiz protokol" }, { status: 400 })
  }
  const host = parsed.hostname
  if (
    host === "localhost" ||
    /^(\d{1,3}\.){3}\d{1,3}$/.test(host) ||
    host.endsWith(".local") ||
    host.endsWith(".internal")
  ) {
    return NextResponse.json({ error: "izin verilmeyen host" }, { status: 400 })
  }

  const normalized = url.slice(0, 500)

  // Serve from DB cache when fresh
  const [cached] = await db
    .select()
    .from(linkPreviews)
    .where(eq(linkPreviews.url, normalized))
    .limit(1)
  if (cached && Date.now() - new Date(cached.fetchedAt).getTime() < CACHE_DAYS * 86400000) {
    return NextResponse.json(cached, {
      headers: { "Cache-Control": "public, max-age=3600" },
    })
  }

  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 5000)
    const res = await fetch(normalized, {
      signal: controller.signal,
      headers: { "User-Agent": "Mozilla/5.0 (compatible; neonsformBot/1.0)" },
      redirect: "follow",
    })
    clearTimeout(timer)

    const contentType = res.headers.get("content-type") ?? ""
    if (!res.ok || !contentType.includes("text/html")) {
      return NextResponse.json({ url: normalized, title: null }, { status: 200 })
    }

    const html = (await res.text()).slice(0, 200000)
    const title =
      extractMeta(html, "title") ?? html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1]?.slice(0, 200) ?? null
    const description = extractMeta(html, "description")
    const imageUrl = extractMeta(html, "image")
    const siteName = extractMeta(html, "site_name") ?? parsed.hostname

    const [saved] = await db
      .insert(linkPreviews)
      .values({ url: normalized, title, description, imageUrl, siteName })
      .onConflictDoUpdate({
        target: linkPreviews.url,
        set: { title, description, imageUrl, siteName, fetchedAt: sql`now()` },
      })
      .returning()

    return NextResponse.json(saved, {
      headers: { "Cache-Control": "public, max-age=3600" },
    })
  } catch {
    return NextResponse.json({ url: normalized, title: null }, { status: 200 })
  }
}

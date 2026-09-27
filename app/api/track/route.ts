import { createHash } from "node:crypto"
import { db } from "@/lib/db"
import { pageViews } from "@/lib/db/schema"
import { type NextRequest, NextResponse } from "next/server"

// First-party page view tracking. Stores an anonymous daily-rotating visitor
// hash (IP + UA + date) so unique visitors can be counted without cookies/PII.
export async function POST(request: NextRequest) {
  try {
    const { path, topicId } = (await request.json()) as { path?: string; topicId?: number }
    if (!path || typeof path !== "string" || path.length > 500) {
      return NextResponse.json({ ok: false }, { status: 400 })
    }
    // Don't track admin pages or API paths
    if (path.startsWith("/admin") || path.startsWith("/api")) {
      return NextResponse.json({ ok: true })
    }

    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      request.headers.get("x-real-ip") ??
      "unknown"
    const ua = request.headers.get("user-agent") ?? ""
    const day = new Date().toISOString().slice(0, 10)
    const visitorHash = createHash("sha256").update(`${ip}|${ua}|${day}`).digest("hex").slice(0, 32)

    await db.insert(pageViews).values({
      path,
      topicId: typeof topicId === "number" ? topicId : null,
      visitorHash,
    })
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 })
  }
}

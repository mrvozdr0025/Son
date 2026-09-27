import { db } from "@/lib/db"
import { topics } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { NextResponse } from "next/server"

// Lightweight liveness endpoint polled by the topic page.
// Returns just enough to detect new activity without heavy payloads.
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const topicId = Number(id)
  if (!Number.isFinite(topicId)) {
    return NextResponse.json({ error: "invalid" }, { status: 400 })
  }

  const [row] = await db
    .select({
      commentCount: topics.commentCount,
      score: topics.score,
      lastActivityAt: topics.lastActivityAt,
    })
    .from(topics)
    .where(eq(topics.id, topicId))
    .limit(1)

  if (!row) return NextResponse.json({ error: "not found" }, { status: 404 })
  return NextResponse.json(row, {
    headers: { "Cache-Control": "no-store" },
  })
}

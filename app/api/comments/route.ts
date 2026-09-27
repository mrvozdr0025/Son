import { NextResponse } from "next/server"
import { getTopicCommentsWithCursor } from "@/lib/queries"

export async function GET(request: Request) {
  const url = new URL(request.url)
  const topicIdRaw = url.searchParams.get("topicId")
  if (!topicIdRaw) {
    return NextResponse.json({ error: "topicId zorunludur" }, { status: 400 })
  }

  const topicId = Number(topicIdRaw)
  if (isNaN(topicId)) {
    return NextResponse.json({ error: "Geçersiz topicId" }, { status: 400 })
  }

  const cursor = url.searchParams.get("cursor") || null
  const limitParam = url.searchParams.get("limit")
  const limit = limitParam ? Math.min(50, Math.max(5, Number(limitParam))) : 30

  const result = await getTopicCommentsWithCursor(topicId, {
    cursor,
    limit,
  })

  return NextResponse.json(result)
}

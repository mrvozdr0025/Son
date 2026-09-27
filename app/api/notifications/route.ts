import { NextResponse } from "next/server"
import { getNotificationsWithCursor } from "@/lib/queries"
import { getCurrentProfile } from "@/lib/session"

export async function GET(request: Request) {
  const profile = await getCurrentProfile()
  if (!profile) {
    return NextResponse.json({ error: "Giriş yapmalısınız" }, { status: 401 })
  }

  const url = new URL(request.url)
  const cursor = url.searchParams.get("cursor") || null
  const limitParam = url.searchParams.get("limit")
  const limit = limitParam ? Math.min(50, Math.max(5, Number(limitParam))) : 20

  const result = await getNotificationsWithCursor({
    profileId: profile.id,
    cursor,
    limit,
  })

  return NextResponse.json(result)
}

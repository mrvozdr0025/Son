import { db } from "@/lib/db"
import { directMessages } from "@/lib/db/schema"
import { getCurrentProfile } from "@/lib/session"
import { and, eq, sql } from "drizzle-orm"

export async function GET() {
  const profile = await getCurrentProfile()
  if (!profile) return Response.json({ unread: 0 })

  const [row] = await db
    .select({ c: sql<number>`count(*)::int` })
    .from(directMessages)
    .where(
      and(
        eq(directMessages.recipientProfileId, profile.id),
        eq(directMessages.isRead, false)
      )
    )

  return Response.json(
    { unread: row?.c ?? 0 },
    { headers: { "Cache-Control": "no-store" } }
  )
}

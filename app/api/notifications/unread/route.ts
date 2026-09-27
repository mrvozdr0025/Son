import { db } from "@/lib/db"
import { notifications } from "@/lib/db/schema"
import { getCurrentProfile } from "@/lib/session"
import { and, eq, sql } from "drizzle-orm"

// Polled by the navbar badge for a live unread count.
export async function GET() {
  const profile = await getCurrentProfile()
  if (!profile) return Response.json({ unread: 0 })

  const [row] = await db
    .select({ c: sql<number>`count(*)::int` })
    .from(notifications)
    .where(and(eq(notifications.profileId, profile.id), eq(notifications.isRead, false)))

  return Response.json(
    { unread: row?.c ?? 0 },
    { headers: { "Cache-Control": "no-store" } },
  )
}

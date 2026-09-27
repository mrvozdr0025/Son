import "server-only"
import { db } from "@/lib/db"
import { rateLimits } from "@/lib/db/schema"
import { and, eq, gt, sql } from "drizzle-orm"

const LIMITS: Record<string, { max: number; windowMinutes: number }> = {
  topic: { max: 3, windowMinutes: 30 },
  comment: { max: 10, windowMinutes: 10 },
  vote: { max: 60, windowMinutes: 10 },
  chat: { max: 15, windowMinutes: 10 },
  report: { max: 5, windowMinutes: 30 },
}

// DB-backed sliding-window rate limit. Throws a Turkish error when exceeded.
export async function checkRateLimit(profileId: number, action: string) {
  const limit = LIMITS[action]
  if (!limit) return
  const windowStart = new Date(Date.now() - limit.windowMinutes * 60 * 1000)
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(rateLimits)
    .where(
      and(
        eq(rateLimits.profileId, profileId),
        eq(rateLimits.action, action),
        gt(rateLimits.createdAt, windowStart),
      ),
    )
  if ((row?.count ?? 0) >= limit.max) {
    throw new Error("Çok hızlısın! Biraz bekleyip tekrar dene.")
  }
  await db.insert(rateLimits).values({ profileId, action })
}

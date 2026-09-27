import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { profiles } from "@/lib/db/schema"
import { desc, ilike, or } from "drizzle-orm"

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim() || ""

  let query = db
    .select({
      id: profiles.id,
      username: profiles.username,
      displayName: profiles.displayName,
      avatarUrl: profiles.avatarUrl,
      isAI: profiles.isAI,
      karma: profiles.karma,
    })
    .from(profiles)

  if (q) {
    const pattern = `%${q}%`
    query = query.where(
      or(ilike(profiles.username, pattern), ilike(profiles.displayName, pattern))
    ) as any
  }

  const rows = await query
    .orderBy(desc(profiles.karma))
    .limit(8)

  return Response.json({ users: rows })
}

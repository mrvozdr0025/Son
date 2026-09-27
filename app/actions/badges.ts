"use server"

import { db } from "@/lib/db"
import { badges, profiles, userBadges } from "@/lib/db/schema"
import { requireProfile } from "@/lib/session"
import { and, eq, inArray } from "drizzle-orm"
import { revalidatePath } from "next/cache"

export async function updateBadgeShowcase(badgeIds: number[]) {
  const profile = await requireProfile()

  // Ensure unique and max 5
  const uniqueIds = [...new Set(badgeIds)].slice(0, 5)

  if (uniqueIds.length > 0) {
    // Verify user owns these badges
    const owned = await db
      .select({ badgeId: userBadges.badgeId })
      .from(userBadges)
      .where(
        and(
          eq(userBadges.profileId, profile.id),
          inArray(userBadges.badgeId, uniqueIds)
        )
      )

    const ownedSet = new Set(owned.map((o) => o.badgeId))
    const validIds = uniqueIds.filter((id) => ownedSet.has(id))

    await db
      .update(profiles)
      .set({ featuredBadgeIds: validIds })
      .where(eq(profiles.id, profile.id))
  } else {
    await db
      .update(profiles)
      .set({ featuredBadgeIds: [] })
      .where(eq(profiles.id, profile.id))
  }

  revalidatePath(`/profil/${profile.username}`)
  revalidatePath("/")
  return { success: true }
}

export async function getFeaturedBadges(profileId: number) {
  const [userProfile] = await db
    .select({ featuredBadgeIds: profiles.featuredBadgeIds })
    .from(profiles)
    .where(eq(profiles.id, profileId))
    .limit(1)

  const ids = (userProfile?.featuredBadgeIds ?? []) as number[]
  if (!ids || ids.length === 0) return []

  const rows = await db
    .select()
    .from(badges)
    .where(inArray(badges.id, ids))

  // Sort in the order specified in featuredBadgeIds
  const map = new Map(rows.map((b) => [b.id, b]))
  return ids.map((id) => map.get(id)).filter(Boolean) as typeof rows
}

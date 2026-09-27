"use server"

import { db } from "@/lib/db"
import { follows } from "@/lib/db/schema"
import { getCurrentProfile } from "@/lib/session"
import { and, eq, sql } from "drizzle-orm"
import { revalidatePath } from "next/cache"

async function requireProfile() {
  const profile = await getCurrentProfile()
  if (!profile || profile.isBanned) throw new Error("Giriş yapmalısın")
  return profile
}

export async function toggleFollow(
  targetType: "user" | "category" | "topic",
  targetId: number
) {
  const profile = await requireProfile()
  if (targetType === "user" && targetId === profile.id) {
    throw new Error("Kendini takip edemezsin")
  }

  const [existing] = await db
    .select({ id: follows.id })
    .from(follows)
    .where(
      and(
        eq(follows.followerProfileId, profile.id),
        eq(follows.targetType, targetType),
        eq(follows.targetId, targetId)
      )
    )
    .limit(1)

  if (existing) {
    await db.delete(follows).where(eq(follows.id, existing.id))
  } else {
    await db
      .insert(follows)
      .values({ followerProfileId: profile.id, targetType, targetId })
      .onConflictDoNothing()
  }

  revalidatePath("/")
  return { following: !existing }
}

export async function isFollowing(
  targetType: "user" | "category" | "topic",
  targetId: number
) {
  const profile = await getCurrentProfile()
  if (!profile) return false
  const [row] = await db
    .select({ id: follows.id })
    .from(follows)
    .where(
      and(
        eq(follows.followerProfileId, profile.id),
        eq(follows.targetType, targetType),
        eq(follows.targetId, targetId)
      )
    )
    .limit(1)
  return !!row
}

export async function getFollowerCount(
  targetType: "user" | "category" | "topic",
  targetId: number
): Promise<number> {
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(follows)
    .where(
      and(
        eq(follows.targetType, targetType),
        eq(follows.targetId, targetId)
      )
    )
  return row?.count ?? 0
}

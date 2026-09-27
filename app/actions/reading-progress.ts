"use server"

import { revalidatePath } from "next/cache"
import { db } from "@/lib/db"
import { topicReads } from "@/lib/db/schema"
import { getCurrentProfile } from "@/lib/session"
import { and, eq } from "drizzle-orm"

export async function markTopicRead(topicId: number): Promise<{ success: boolean; isRead: boolean }> {
  try {
    const current = await getCurrentProfile()
    if (!current) {
      return { success: true, isRead: true }
    }

    const [existing] = await db
      .select({ id: topicReads.id })
      .from(topicReads)
      .where(and(eq(topicReads.profileId, current.id), eq(topicReads.topicId, topicId)))
      .limit(1)

    if (!existing) {
      await db.insert(topicReads).values({
        profileId: current.id,
        topicId,
      })
    }

    revalidatePath(`/konu`)
    return { success: true, isRead: true }
  } catch (err: any) {
    console.error("[reading-progress] markTopicRead error:", err)
    return { success: false, isRead: false }
  }
}

export async function toggleTopicRead(topicId: number): Promise<{ success: boolean; isRead: boolean }> {
  try {
    const current = await getCurrentProfile()
    if (!current) {
      return { success: true, isRead: true }
    }

    const [existing] = await db
      .select({ id: topicReads.id })
      .from(topicReads)
      .where(and(eq(topicReads.profileId, current.id), eq(topicReads.topicId, topicId)))
      .limit(1)

    if (existing) {
      await db.delete(topicReads).where(eq(topicReads.id, existing.id))
      return { success: true, isRead: false }
    } else {
      await db.insert(topicReads).values({
        profileId: current.id,
        topicId,
      })
      return { success: true, isRead: true }
    }
  } catch (err: any) {
    console.error("[reading-progress] toggleTopicRead error:", err)
    return { success: false, isRead: false }
  }
}

export async function isTopicRead(topicId: number): Promise<boolean> {
  const current = await getCurrentProfile()
  if (!current) return false

  const [existing] = await db
    .select({ id: topicReads.id })
    .from(topicReads)
    .where(and(eq(topicReads.profileId, current.id), eq(topicReads.topicId, topicId)))
    .limit(1)

  return Boolean(existing)
}

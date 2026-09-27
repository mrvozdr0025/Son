"use server"

import { db } from "@/lib/db"
import { commentReactions, comments, notifications, profiles } from "@/lib/db/schema"
import { getCurrentProfile, requireProfile } from "@/lib/session"
import { and, eq, inArray, sql } from "drizzle-orm"
import { revalidatePath } from "next/cache"

import { ALLOWED_EMOJIS, type AllowedEmoji } from "@/lib/constants"
export type { AllowedEmoji }

export type ReactionSummary = {
  emoji: string
  count: number
  hasReacted: boolean
}

export async function toggleCommentReaction(commentId: number, emoji: string) {
  const profile = await requireProfile()

  if (!ALLOWED_EMOJIS.includes(emoji as AllowedEmoji)) {
    throw new Error("Geçersiz emoji tepkisi")
  }

  const [comment] = await db
    .select({ id: comments.id, topicId: comments.topicId, authorProfileId: comments.authorProfileId })
    .from(comments)
    .where(eq(comments.id, commentId))
    .limit(1)

  if (!comment) throw new Error("Yorum bulunamadı")

  // Check if existing
  const [existing] = await db
    .select()
    .from(commentReactions)
    .where(
      and(
        eq(commentReactions.commentId, commentId),
        eq(commentReactions.profileId, profile.id),
        eq(commentReactions.emoji, emoji)
      )
    )
    .limit(1)

  let added = false
  if (existing) {
    await db.delete(commentReactions).where(eq(commentReactions.id, existing.id))
  } else {
    await db.insert(commentReactions).values({
      commentId,
      profileId: profile.id,
      emoji,
    })
    added = true

    // Notify author if not reacting to own comment
    if (comment.authorProfileId !== profile.id) {
      await db.insert(notifications).values({
        profileId: comment.authorProfileId,
        actorProfileId: profile.id,
        type: "reaction",
        message: `${profile.displayName} yorumuna ${emoji} tepkisi verdi`,
        topicId: comment.topicId,
        commentId,
      })

      // Award 1 XP for positive engagement
      await db
        .update(profiles)
        .set({
          xp: sql`${profiles.xp} + 1`,
          karma: sql`${profiles.karma} + 1`,
        })
        .where(eq(profiles.id, comment.authorProfileId))
    }
  }

  revalidatePath("/")
  return { added, emoji }
}

export async function getReactionsForComments(
  commentIds: number[]
): Promise<Record<number, ReactionSummary[]>> {
  if (commentIds.length === 0) return {}

  const viewer = await getCurrentProfile()

  const rows = await db
    .select({
      commentId: commentReactions.commentId,
      emoji: commentReactions.emoji,
      count: sql<number>`count(*)::int`,
    })
    .from(commentReactions)
    .where(inArray(commentReactions.commentId, commentIds))
    .groupBy(commentReactions.commentId, commentReactions.emoji)

  const viewerReactions = viewer
    ? await db
        .select({
          commentId: commentReactions.commentId,
          emoji: commentReactions.emoji,
        })
        .from(commentReactions)
        .where(
          and(
            inArray(commentReactions.commentId, commentIds),
            eq(commentReactions.profileId, viewer.id)
          )
        )
    : []

  const viewerSet = new Set(
    viewerReactions.map((r) => `${r.commentId}:${r.emoji}`)
  )

  const result: Record<number, ReactionSummary[]> = {}
  for (const cid of commentIds) {
    result[cid] = []
  }

  for (const r of rows) {
    if (!result[r.commentId]) result[r.commentId] = []
    result[r.commentId].push({
      emoji: r.emoji,
      count: r.count,
      hasReacted: viewerSet.has(`${r.commentId}:${r.emoji}`),
    })
  }

  return result
}

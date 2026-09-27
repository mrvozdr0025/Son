"use server"

import { db } from "@/lib/db"
import { bookmarks, categories, profiles, topics } from "@/lib/db/schema"
import { getCurrentProfile, requireProfile } from "@/lib/session"
import { and, desc, eq, inArray } from "drizzle-orm"
import { revalidatePath } from "next/cache"

export async function toggleBookmark(topicId: number) {
  const profile = await requireProfile()

  const [existing] = await db
    .select({ id: bookmarks.id })
    .from(bookmarks)
    .where(and(eq(bookmarks.profileId, profile.id), eq(bookmarks.topicId, topicId)))
    .limit(1)

  let bookmarked = false
  if (existing) {
    await db.delete(bookmarks).where(eq(bookmarks.id, existing.id))
    bookmarked = false
  } else {
    await db.insert(bookmarks).values({
      profileId: profile.id,
      topicId,
    })
    bookmarked = true
  }

  revalidatePath("/kaydedilenler")
  return { bookmarked }
}

export async function isTopicBookmarked(topicId: number): Promise<boolean> {
  const profile = await getCurrentProfile()
  if (!profile) return false

  const [row] = await db
    .select({ id: bookmarks.id })
    .from(bookmarks)
    .where(and(eq(bookmarks.profileId, profile.id), eq(bookmarks.topicId, topicId)))
    .limit(1)

  return Boolean(row)
}

export async function getBookmarkedTopicIds(topicIds: number[]): Promise<Set<number>> {
  if (topicIds.length === 0) return new Set()
  const profile = await getCurrentProfile()
  if (!profile) return new Set()

  const rows = await db
    .select({ topicId: bookmarks.topicId })
    .from(bookmarks)
    .where(and(eq(bookmarks.profileId, profile.id), inArray(bookmarks.topicId, topicIds)))

  return new Set(rows.map((r) => r.topicId))
}

export async function getUserBookmarks() {
  const profile = await getCurrentProfile()
  if (!profile) return []

  const rows = await db
    .select({
      bookmarkId: bookmarks.id,
      bookmarkedAt: bookmarks.createdAt,
      id: topics.id,
      slug: topics.slug,
      title: topics.title,
      content: topics.content,
      categoryId: topics.categoryId,
      score: topics.score,
      commentCount: topics.commentCount,
      viewCount: topics.viewCount,
      isHot: topics.isHot,
      isPinned: topics.isPinned,
      isDailyTopic: topics.isDailyTopic,
      isPoll: topics.isPoll,
      isLocked: topics.isLocked,
      acceptedCommentId: topics.acceptedCommentId,
      createdAt: topics.createdAt,
      lastActivityAt: topics.lastActivityAt,
      authorProfileId: topics.authorProfileId,
      authorUsername: profiles.username,
      authorDisplayName: profiles.displayName,
      authorAvatarUrl: profiles.avatarUrl,
      authorIsAI: profiles.isAI,
      authorLevel: profiles.level,
      authorFeaturedBadges: profiles.featuredBadgeIds,
      categoryName: categories.name,
      categorySlug: categories.slug,
      categoryColor: categories.color,
    })
    .from(bookmarks)
    .innerJoin(topics, eq(bookmarks.topicId, topics.id))
    .innerJoin(profiles, eq(topics.authorProfileId, profiles.id))
    .innerJoin(categories, eq(topics.categoryId, categories.id))
    .where(eq(bookmarks.profileId, profile.id))
    .orderBy(desc(bookmarks.createdAt))

  return rows
}

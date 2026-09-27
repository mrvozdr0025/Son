import "server-only"
import { db } from "@/lib/db"
import {
  badges,
  categories,
  comments,
  commentReactions,
  notifications,
  polls,
  pollOptions,
  profiles,
  tags,
  topics,
  topicTags,
  userBadges,
  userMutes,
} from "@/lib/db/schema"
import { and, asc, desc, eq, ilike, inArray, or, sql } from "drizzle-orm"
import { getCurrentProfile } from "@/lib/session"
import { unstable_cache } from "next/cache"

export const PAGE_SIZE = 15

export type FeedSort = "yeni" | "populer" | "aktif" | "takip"

const authorCols = {
  authorUsername: profiles.username,
  authorDisplayName: profiles.displayName,
  authorAvatarUrl: profiles.avatarUrl,
  authorIsAI: profiles.isAI,
  authorLevel: profiles.level,
  authorFeaturedBadges: profiles.featuredBadgeIds,
}

const topicCols = {
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
  acceptedCommentId: topics.acceptedCommentId,
  aiSummary: topics.aiSummary,
  createdAt: topics.createdAt,
  lastActivityAt: topics.lastActivityAt,
}

export type FeedTopic = {
  id: number
  slug: string
  title: string
  content: string
  categoryId: number
  score: number
  commentCount: number
  viewCount: number
  isHot: boolean
  isPinned: boolean
  isDailyTopic: boolean
  isPoll: boolean
  acceptedCommentId: number | null
  createdAt: Date
  lastActivityAt: Date
  authorUsername: string
  authorDisplayName: string
  authorAvatarUrl: string | null
  authorIsAI: boolean
  authorLevel: number
  authorFeaturedBadges: number[] | string | null | any
  categoryName: string
  categorySlug: string
  categoryColor: string
}

export function encodeCursor(data: unknown): string {
  return Buffer.from(JSON.stringify(data)).toString("base64url")
}

export function decodeCursor<T = unknown>(str: string): T | null {
  try {
    const json = Buffer.from(str, "base64url").toString("utf8")
    return JSON.parse(json) as T
  } catch {
    return null
  }
}

export async function getFeedWithCursor(opts: {
  sort?: FeedSort
  categoryId?: number
  cursor?: string | null
  limit?: number
  viewerProfileId?: number
}) {
  const { sort = "aktif", categoryId, cursor, limit = PAGE_SIZE, viewerProfileId } = opts

  const order =
    sort === "yeni"
      ? desc(topics.createdAt)
      : sort === "populer"
        ? desc(topics.score)
        : desc(topics.lastActivityAt)

  // Decode cursor if provided
  const cursorData = cursor ? decodeCursor<{ id: number; v: string | number }>(cursor) : null
  let cursorFilter = undefined

  if (cursorData) {
    if (sort === "yeni") {
      const d = new Date(cursorData.v)
      cursorFilter = sql`(${topics.createdAt} < ${d} OR (${topics.createdAt} = ${d} AND ${topics.id} < ${cursorData.id}))`
    } else if (sort === "populer") {
      const s = Number(cursorData.v)
      cursorFilter = sql`(${topics.score} < ${s} OR (${topics.score} = ${s} AND ${topics.id} < ${cursorData.id}))`
    } else {
      // aktif or takip
      const d = new Date(cursorData.v)
      cursorFilter = sql`(${topics.lastActivityAt} < ${d} OR (${topics.lastActivityAt} = ${d} AND ${topics.id} < ${cursorData.id}))`
    }
  }

  // "Takip Ettiklerim": topics from followed users OR in followed categories
  const followFilter =
    sort === "takip" && viewerProfileId
      ? sql`(
          ${topics.authorProfileId} IN (
            SELECT "targetId" FROM follows
            WHERE "followerProfileId" = ${viewerProfileId} AND "targetType" = 'user'
          )
          OR ${topics.categoryId} IN (
            SELECT "targetId" FROM follows
            WHERE "followerProfileId" = ${viewerProfileId} AND "targetType" = 'category'
          )
        )`
      : undefined

  // Hide topics authored by users the viewer has muted
  const muteFilter = viewerProfileId
    ? sql`${topics.authorProfileId} NOT IN (
        SELECT "mutedProfileId" FROM user_mutes WHERE "profileId" = ${viewerProfileId}
      )`
    : undefined

  // Pinned topics only appear on the first page (no cursor)
  const isPinnedFilter = cursorData ? eq(topics.isPinned, false) : undefined

  const rows = await db
    .select({
      ...topicCols,
      ...authorCols,
      categoryName: categories.name,
      categorySlug: categories.slug,
      categoryColor: categories.color,
    })
    .from(topics)
    .innerJoin(profiles, eq(topics.authorProfileId, profiles.id))
    .innerJoin(categories, eq(topics.categoryId, categories.id))
    .where(
      and(
        categoryId ? eq(topics.categoryId, categoryId) : undefined,
        followFilter,
        muteFilter,
        isPinnedFilter,
        cursorFilter
      )
    )
    .orderBy(
      cursorData ? order : desc(topics.isPinned),
      desc(topics.id)
    )
    .limit(limit + 1)

  const hasMore = rows.length > limit
  const topicItems = hasMore ? rows.slice(0, limit) : rows
  const lastItem = topicItems[topicItems.length - 1]

  let nextCursor: string | null = null
  if (hasMore && lastItem) {
    let cursorVal: string | number
    if (sort === "yeni") {
      cursorVal = lastItem.createdAt.toISOString()
    } else if (sort === "populer") {
      cursorVal = lastItem.score
    } else {
      cursorVal = lastItem.lastActivityAt.toISOString()
    }
    nextCursor = encodeCursor({ id: lastItem.id, v: cursorVal })
  }

  return {
    topics: topicItems as unknown as FeedTopic[],
    nextCursor,
    hasMore,
  }
}

export async function getFeed(opts: {
  sort?: FeedSort
  categoryId?: number
  page?: number
  cursor?: string | null
  viewerProfileId?: number
}) {
  if (opts.cursor) {
    const res = await getFeedWithCursor({
      sort: opts.sort,
      categoryId: opts.categoryId,
      cursor: opts.cursor,
      viewerProfileId: opts.viewerProfileId,
    })
    return res.topics
  }

  const { sort = "aktif", categoryId, page = 0, viewerProfileId } = opts
  const order =
    sort === "yeni"
      ? desc(topics.createdAt)
      : sort === "populer"
        ? desc(topics.score)
        : desc(topics.lastActivityAt)

  // "Takip Ettiklerim": topics from followed users OR in followed categories
  const followFilter =
    sort === "takip" && viewerProfileId
      ? sql`(
          ${topics.authorProfileId} IN (
            SELECT "targetId" FROM follows
            WHERE "followerProfileId" = ${viewerProfileId} AND "targetType" = 'user'
          )
          OR ${topics.categoryId} IN (
            SELECT "targetId" FROM follows
            WHERE "followerProfileId" = ${viewerProfileId} AND "targetType" = 'category'
          )
        )`
      : undefined

  // Hide topics authored by users the viewer has muted
  const muteFilter = viewerProfileId
    ? sql`${topics.authorProfileId} NOT IN (
        SELECT "mutedProfileId" FROM user_mutes WHERE "profileId" = ${viewerProfileId}
      )`
    : undefined

  return db
    .select({
      ...topicCols,
      ...authorCols,
      categoryName: categories.name,
      categorySlug: categories.slug,
      categoryColor: categories.color,
    })
    .from(topics)
    .innerJoin(profiles, eq(topics.authorProfileId, profiles.id))
    .innerJoin(categories, eq(topics.categoryId, categories.id))
    .where(and(categoryId ? eq(topics.categoryId, categoryId) : undefined, followFilter, muteFilter))
    .orderBy(desc(topics.isPinned), sort === "takip" ? desc(topics.lastActivityAt) : order)
    .limit(PAGE_SIZE)
    .offset(page * PAGE_SIZE) as unknown as Promise<FeedTopic[]>
}

export async function getCategories() {
  return db.select().from(categories).orderBy(desc(categories.topicCount))
}

export async function getCategoryBySlug(slug: string) {
  const rows = await db.select().from(categories).where(eq(categories.slug, slug)).limit(1)
  return rows[0] ?? null
}

export async function getTopicBySlug(slug: string) {
  const rows = await db
    .select({
      ...topicCols,
      isLocked: topics.isLocked,
      acceptedCommentId: topics.acceptedCommentId,
      authorProfileId: topics.authorProfileId,
      ...authorCols,
      authorKarma: profiles.karma,
      categoryName: categories.name,
      categorySlug: categories.slug,
      categoryColor: categories.color,
    })
    .from(topics)
    .innerJoin(profiles, eq(topics.authorProfileId, profiles.id))
    .innerJoin(categories, eq(topics.categoryId, categories.id))
    .where(eq(topics.slug, slug))
    .limit(1)
  return rows[0] ?? null
}

export type TopicComment = Awaited<ReturnType<typeof getTopicComments>>[number]

export async function getTopicComments(topicId: number) {
  const commentList = await db
    .select({
      id: comments.id,
      parentId: comments.parentId,
      content: comments.content,
      score: comments.score,
      isFunny: comments.isFunny,
      isDeleted: comments.isDeleted,
      createdAt: comments.createdAt,
      authorProfileId: comments.authorProfileId,
      ...authorCols,
    })
    .from(comments)
    .innerJoin(profiles, eq(comments.authorProfileId, profiles.id))
    .where(eq(comments.topicId, topicId))
    .orderBy(comments.createdAt)

  if (commentList.length === 0) return []

  const commentIds = commentList.map((c) => c.id)
  const viewer = await getCurrentProfile()

  const reactionRows = await db
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

  const reactionsMap: Record<number, { emoji: string; count: number; hasReacted: boolean }[]> = {}
  for (const cid of commentIds) {
    reactionsMap[cid] = []
  }

  for (const r of reactionRows) {
    if (!reactionsMap[r.commentId]) reactionsMap[r.commentId] = []
    reactionsMap[r.commentId].push({
      emoji: r.emoji,
      count: r.count,
      hasReacted: viewerSet.has(`${r.commentId}:${r.emoji}`),
    })
  }

  return commentList.map((c) => ({
    ...c,
    reactions: reactionsMap[c.id] ?? [],
  }))
}

export async function getTopicCommentsWithCursor(
  topicId: number,
  opts?: {
    cursor?: string | null
    limit?: number
  }
) {
  const limit = opts?.limit ?? 30
  const cursorData = opts?.cursor ? decodeCursor<{ id: number; v: string }>(opts.cursor) : null
  let cursorFilter = undefined

  if (cursorData) {
    const d = new Date(cursorData.v)
    cursorFilter = sql`(${comments.createdAt} > ${d} OR (${comments.createdAt} = ${d} AND ${comments.id} > ${cursorData.id}))`
  }

  const rows = await db
    .select({
      id: comments.id,
      parentId: comments.parentId,
      content: comments.content,
      score: comments.score,
      isFunny: comments.isFunny,
      isDeleted: comments.isDeleted,
      createdAt: comments.createdAt,
      authorProfileId: comments.authorProfileId,
      ...authorCols,
    })
    .from(comments)
    .innerJoin(profiles, eq(comments.authorProfileId, profiles.id))
    .where(and(eq(comments.topicId, topicId), cursorFilter))
    .orderBy(asc(comments.createdAt), asc(comments.id))
    .limit(limit + 1)

  const hasMore = rows.length > limit
  const items = hasMore ? rows.slice(0, limit) : rows
  const lastItem = items[items.length - 1]

  let nextCursor: string | null = null
  if (hasMore && lastItem) {
    nextCursor = encodeCursor({ id: lastItem.id, v: lastItem.createdAt.toISOString() })
  }

  const commentIds = items.map((c) => c.id)
  let reactionsMap: Record<number, { emoji: string; count: number; hasReacted: boolean }[]> = {}

  if (commentIds.length > 0) {
    const viewer = await getCurrentProfile()
    const reactionRows = await db
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

    const viewerSet = new Set(viewerReactions.map((r) => `${r.commentId}:${r.emoji}`))

    for (const cid of commentIds) {
      reactionsMap[cid] = []
    }

    for (const r of reactionRows) {
      if (!reactionsMap[r.commentId]) reactionsMap[r.commentId] = []
      reactionsMap[r.commentId].push({
        emoji: r.emoji,
        count: r.count,
        hasReacted: viewerSet.has(`${r.commentId}:${r.emoji}`),
      })
    }
  }

  return {
    comments: items.map((c) => ({
      ...c,
      reactions: reactionsMap[c.id] ?? [],
    })),
    nextCursor,
    hasMore,
  }
}

export type NotificationItem = {
  id: number
  type: string
  message: string
  isRead: boolean
  createdAt: Date
  topicSlug: string | null
}

export async function getNotificationsWithCursor(opts: {
  profileId: number
  cursor?: string | null
  limit?: number
}) {
  const { profileId, cursor, limit = 20 } = opts
  const cursorData = cursor ? decodeCursor<{ id: number; v?: string; createdAt?: string }>(cursor) : null
  let cursorFilter = undefined

  if (cursorData) {
    const raw = cursorData.createdAt || cursorData.v
    if (raw) {
      const d = new Date(raw)
      cursorFilter = sql`(${notifications.createdAt} < ${d} OR (${notifications.createdAt} = ${d} AND ${notifications.id} < ${cursorData.id}))`
    }
  }

  const rows = await db
    .select({
      id: notifications.id,
      type: notifications.type,
      message: notifications.message,
      isRead: notifications.isRead,
      createdAt: notifications.createdAt,
      topicSlug: topics.slug,
    })
    .from(notifications)
    .leftJoin(topics, eq(notifications.topicId, topics.id))
    .where(and(eq(notifications.profileId, profileId), cursorFilter))
    .orderBy(desc(notifications.createdAt), desc(notifications.id))
    .limit(limit + 1)

  const hasMore = rows.length > limit
  const items = hasMore ? rows.slice(0, limit) : rows
  const lastItem = items[items.length - 1]

  let nextCursor: string | null = null
  if (hasMore && lastItem) {
    nextCursor = encodeCursor({ id: lastItem.id, v: lastItem.createdAt.toISOString() })
  }

  return {
    notifications: items,
    nextCursor,
    hasMore,
  }
}

export async function getPollForTopic(topicId: number) {
  const [poll] = await db.select().from(polls).where(eq(polls.topicId, topicId)).limit(1)
  if (!poll) return null
  const options = await db
    .select()
    .from(pollOptions)
    .where(eq(pollOptions.pollId, poll.id))
    .orderBy(pollOptions.id)
  return { ...poll, options }
}

export async function getTopicTags(topicId: number) {
  return db
    .select({ id: tags.id, name: tags.name, slug: tags.slug })
    .from(topicTags)
    .innerJoin(tags, eq(topicTags.tagId, tags.id))
    .where(eq(topicTags.topicId, topicId))
}

export async function getMutedProfileIds(profileId: number): Promise<number[]> {
  const rows = await db
    .select({ mutedProfileId: userMutes.mutedProfileId })
    .from(userMutes)
    .where(eq(userMutes.profileId, profileId))
  return rows.map((r) => r.mutedProfileId)
}

export async function isMuted(profileId: number, mutedProfileId: number) {
  const rows = await db
    .select({ id: userMutes.id })
    .from(userMutes)
    .where(and(eq(userMutes.profileId, profileId), eq(userMutes.mutedProfileId, mutedProfileId)))
    .limit(1)
  return rows.length > 0
}

export async function getTagBySlug(slug: string) {
  const rows = await db.select().from(tags).where(eq(tags.slug, slug)).limit(1)
  return rows[0] ?? null
}

export async function getTopicsByTag(tagId: number, page = 0) {
  return db
    .select({
      ...topicCols,
      ...authorCols,
      categoryName: categories.name,
      categorySlug: categories.slug,
      categoryColor: categories.color,
    })
    .from(topicTags)
    .innerJoin(topics, eq(topicTags.topicId, topics.id))
    .innerJoin(profiles, eq(topics.authorProfileId, profiles.id))
    .innerJoin(categories, eq(topics.categoryId, categories.id))
    .where(eq(topicTags.tagId, tagId))
    .orderBy(desc(topics.lastActivityAt))
    .limit(PAGE_SIZE)
    .offset(page * PAGE_SIZE)
}

export async function getPopularTags(limit = 20) {
  return db
    .select({
      id: tags.id,
      name: tags.name,
      slug: tags.slug,
      topicCount: sql<number>`count(${topicTags.id})::int`,
    })
    .from(tags)
    .innerJoin(topicTags, eq(tags.id, topicTags.tagId))
    .groupBy(tags.id)
    .orderBy(desc(sql`count(${topicTags.id})`))
    .limit(limit)
}

export async function getProfileByUsername(username: string) {
  const rows = await db
    .select()
    .from(profiles)
    .where(eq(profiles.username, username))
    .limit(1)
  return rows[0] ?? null
}

export async function getProfileBadges(profileId: number) {
  return db
    .select({
      id: badges.id,
      name: badges.name,
      slug: badges.slug,
      description: badges.description,
      icon: badges.icon,
      color: badges.color,
      awardedAt: userBadges.awardedAt,
    })
    .from(userBadges)
    .innerJoin(badges, eq(userBadges.badgeId, badges.id))
    .where(eq(userBadges.profileId, profileId))
}

export async function getProfileTopics(profileId: number, limit = 10) {
  return db
    .select({
      ...topicCols,
      categoryName: categories.name,
      categorySlug: categories.slug,
      categoryColor: categories.color,
    })
    .from(topics)
    .innerJoin(categories, eq(topics.categoryId, categories.id))
    .where(eq(topics.authorProfileId, profileId))
    .orderBy(desc(topics.createdAt))
    .limit(limit)
}

export async function getProfileComments(profileId: number, limit = 10) {
  return db
    .select({
      id: comments.id,
      content: comments.content,
      score: comments.score,
      createdAt: comments.createdAt,
      topicSlug: topics.slug,
      topicTitle: topics.title,
    })
    .from(comments)
    .innerJoin(topics, eq(comments.topicId, topics.id))
    .where(and(eq(comments.authorProfileId, profileId), eq(comments.isDeleted, false)))
    .orderBy(desc(comments.createdAt))
    .limit(limit)
}

export async function searchAll(q: string) {
  const term = `%${q}%`
  // Turkish full-text search with relevance ranking; hits the GIN index.
  const tsQuery = sql`websearch_to_tsquery('turkish', ${q})`
  const tsVector = sql`to_tsvector('turkish', ${topics.title} || ' ' || ${topics.content})`

  let topicResults = await db
    .select({
      ...topicCols,
      ...authorCols,
      categoryName: categories.name,
      categorySlug: categories.slug,
      categoryColor: categories.color,
      rank: sql<number>`ts_rank(${tsVector}, ${tsQuery})`.as("rank"),
    })
    .from(topics)
    .innerJoin(profiles, eq(topics.authorProfileId, profiles.id))
    .innerJoin(categories, eq(topics.categoryId, categories.id))
    .where(sql`${tsVector} @@ ${tsQuery}`)
    .orderBy(sql`rank DESC`, desc(topics.score))
    .limit(20)

  // Fallback to substring match for partial words FTS can't stem (e.g. "tekno")
  if (topicResults.length === 0) {
    topicResults = await db
      .select({
        ...topicCols,
        ...authorCols,
        categoryName: categories.name,
        categorySlug: categories.slug,
        categoryColor: categories.color,
        rank: sql<number>`0`.as("rank"),
      })
      .from(topics)
      .innerJoin(profiles, eq(topics.authorProfileId, profiles.id))
      .innerJoin(categories, eq(topics.categoryId, categories.id))
      .where(or(ilike(topics.title, term), ilike(topics.content, term)))
      .orderBy(desc(topics.score))
      .limit(20)
  }

  // Comment hits (FTS) linked back to their topic
  const commentResults = await db
    .select({
      id: comments.id,
      content: comments.content,
      score: comments.score,
      createdAt: comments.createdAt,
      topicSlug: topics.slug,
      topicTitle: topics.title,
      authorUsername: profiles.username,
      authorDisplayName: profiles.displayName,
    })
    .from(comments)
    .innerJoin(topics, eq(comments.topicId, topics.id))
    .innerJoin(profiles, eq(comments.authorProfileId, profiles.id))
    .where(
      and(
        sql`to_tsvector('turkish', ${comments.content}) @@ ${tsQuery}`,
        eq(comments.isDeleted, false),
      ),
    )
    .orderBy(sql`ts_rank(to_tsvector('turkish', ${comments.content}), ${tsQuery}) DESC`)
    .limit(10)

  const userResults = await db
    .select()
    .from(profiles)
    .where(
      and(
        or(ilike(profiles.username, term), ilike(profiles.displayName, term)),
        eq(profiles.isBanned, false),
      ),
    )
    .limit(10)

  return { topics: topicResults, comments: commentResults, users: userResults }
}

// Cached for 5 min: leaderboard is read on every page but changes slowly.
export const getLeaderboard = unstable_cache(
  async (limit = 10) => {
    return db
      .select()
      .from(profiles)
      .where(eq(profiles.isBanned, false))
      .orderBy(desc(profiles.karma))
      .limit(limit)
  },
  ["leaderboard"],
  { revalidate: 300 },
)

// Cached for 5 min: three count(*) queries on every page load add up fast.
export const getSidebarStats = unstable_cache(
  async () => {
    const [topicCount] = await db.select({ c: sql<number>`count(*)::int` }).from(topics)
    const [commentCount] = await db.select({ c: sql<number>`count(*)::int` }).from(comments)
    const [memberCount] = await db.select({ c: sql<number>`count(*)::int` }).from(profiles)
    return {
      topics: topicCount?.c ?? 0,
      comments: commentCount?.c ?? 0,
      members: memberCount?.c ?? 0,
    }
  },
  ["sidebar-stats"],
  { revalidate: 300 },
)

export async function incrementViewCount(topicId: number) {
  await db
    .update(topics)
    .set({ viewCount: sql`${topics.viewCount} + 1` })
    .where(eq(topics.id, topicId))
}

export async function getRelatedTopics(topicId: number, categoryId: number, limit = 4) {
  return db
    .select({
      id: topics.id,
      slug: topics.slug,
      title: topics.title,
      score: topics.score,
      commentCount: topics.commentCount,
      viewCount: topics.viewCount,
      createdAt: topics.createdAt,
      categoryName: categories.name,
      categoryColor: categories.color,
    })
    .from(topics)
    .innerJoin(categories, eq(topics.categoryId, categories.id))
    .where(and(eq(topics.categoryId, categoryId), sql`${topics.id} != ${topicId}`))
    .orderBy(desc(topics.score), desc(topics.createdAt))
    .limit(limit)
}

export async function getAllTags() {
  return db
    .select({
      id: tags.id,
      name: tags.name,
      slug: tags.slug,
      topicCount: sql<number>`count(${topicTags.id})::int`,
    })
    .from(tags)
    .leftJoin(topicTags, eq(tags.id, topicTags.tagId))
    .groupBy(tags.id)
    .orderBy(desc(sql`count(${topicTags.id})`))
}

export type LeaderboardTimeframe = "week" | "month" | "all"

export async function getDetailedLeaderboard(
  timeframe: LeaderboardTimeframe = "all",
  limit = 50
) {
  const rows = await db
    .select()
    .from(profiles)
    .where(eq(profiles.isBanned, false))
    .orderBy(desc(profiles.xp), desc(profiles.karma))
    .limit(limit)

  return rows.map((r, idx) => ({
    ...r,
    rank: idx + 1,
    periodXp: r.xp,
    topicCount: 0,
    commentCount: 0,
  }))
}

export async function searchAdvanced(filters: {
  q?: string
  categorySlug?: string
  tagSlug?: string
  authorUsername?: string
  timeRange?: string
  sortBy?: string
}): Promise<{ topics: FeedTopic[]; users: (typeof profiles.$inferSelect)[] }> {
  const conditions = []

  if (filters.q && filters.q.trim()) {
    const term = `%${filters.q.trim()}%`
    conditions.push(or(ilike(topics.title, term), ilike(topics.content, term)))
  }

  if (filters.categorySlug && filters.categorySlug !== "all") {
    conditions.push(eq(categories.slug, filters.categorySlug))
  }

  if (filters.authorUsername && filters.authorUsername.trim()) {
    conditions.push(eq(profiles.username, filters.authorUsername.trim()))
  }

  if (filters.timeRange && filters.timeRange !== "all") {
    const now = new Date()
    let since = new Date()
    if (filters.timeRange === "today") since.setDate(now.getDate() - 1)
    else if (filters.timeRange === "week") since.setDate(now.getDate() - 7)
    else if (filters.timeRange === "month") since.setMonth(now.getMonth() - 1)
    else if (filters.timeRange === "year") since.setFullYear(now.getFullYear() - 1)
    conditions.push(sql`${topics.createdAt} >= ${since}`)
  }

  let orderByClause = desc(topics.createdAt)
  if (filters.sortBy === "score" || filters.sortBy === "popular") {
    orderByClause = desc(topics.score)
  } else if (filters.sortBy === "comments") {
    orderByClause = desc(topics.commentCount)
  } else if (filters.sortBy === "views") {
    orderByClause = desc(topics.viewCount)
  }

  const query = db
    .select({
      ...topicCols,
      ...authorCols,
      categoryName: categories.name,
      categorySlug: categories.slug,
      categoryColor: categories.color,
    })
    .from(topics)
    .innerJoin(profiles, eq(topics.authorProfileId, profiles.id))
    .innerJoin(categories, eq(topics.categoryId, categories.id))

  const topicRows = conditions.length > 0
    ? await query.where(and(...conditions)).orderBy(orderByClause).limit(50)
    : await query.orderBy(orderByClause).limit(50)

  let userRows: (typeof profiles.$inferSelect)[] = []
  if (filters.q && filters.q.trim()) {
    const term = `%${filters.q.trim()}%`
    userRows = await db
      .select()
      .from(profiles)
      .where(
        and(
          or(ilike(profiles.username, term), ilike(profiles.displayName, term)),
          eq(profiles.isBanned, false),
        ),
      )
      .limit(10)
  }

  return { topics: topicRows, users: userRows }
}

export interface CategoryTagItem {
  id: number
  name: string
  slug: string
  count: number
}

export async function getCategoryTagsMap(): Promise<Record<number, CategoryTagItem[]>> {
  try {
    const rows = await db
      .select({
        id: tags.id,
        categoryId: topics.categoryId,
        name: tags.name,
        slug: tags.slug,
        count: sql<number>`count(*)::int`,
      })
      .from(topicTags)
      .innerJoin(topics, eq(topicTags.topicId, topics.id))
      .innerJoin(tags, eq(topicTags.tagId, tags.id))
      .groupBy(topics.categoryId, tags.id, tags.name, tags.slug)
      .orderBy(desc(sql`count(*)`))

    const map: Record<number, CategoryTagItem[]> = {}
    for (const r of rows) {
      if (!map[r.categoryId]) map[r.categoryId] = []
      map[r.categoryId].push({ id: r.id, name: r.name, slug: r.slug, count: r.count })
    }
    return map
  } catch {
    return {}
  }
}



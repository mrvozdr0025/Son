import { relations, sql } from "drizzle-orm"
import {
  pgTable,
  text,
  timestamp,
  boolean,
  serial,
  integer,
  real,
  date,
  jsonb,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core"

// --- Better Auth required tables -------------------------------------------
// Column names are camelCase to match Better Auth's defaults. Do not rename.

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("emailVerified").notNull().default(false),
  image: text("image"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
})

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expiresAt").notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
  ipAddress: text("ipAddress"),
  userAgent: text("userAgent"),
  userId: text("userId")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
})

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  accountId: text("accountId").notNull(),
  providerId: text("providerId").notNull(),
  userId: text("userId")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("accessToken"),
  refreshToken: text("refreshToken"),
  idToken: text("idToken"),
  accessTokenExpiresAt: timestamp("accessTokenExpiresAt"),
  refreshTokenExpiresAt: timestamp("refreshTokenExpiresAt"),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
})

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expiresAt").notNull(),
  createdAt: timestamp("createdAt").defaultNow(),
  updatedAt: timestamp("updatedAt").defaultNow(),
})

// --- App tables ------------------------------------------------------------
// Forum tables. `userId` columns are plain text (no FK) for per-user scoping.
// AI users have profiles without a linked auth user (userId is null for them).

export interface NotificationPreferences {
  topicReply: boolean
  commentReply: boolean
  mention: boolean
  reaction: boolean
  badge: boolean
  follow: boolean
}

export const defaultNotificationPreferences: NotificationPreferences = {
  topicReply: true,
  commentReply: true,
  mention: true,
  reaction: true,
  badge: true,
  follow: true,
}

export const profiles = pgTable(
  "profiles",
  {
    id: serial("id").primaryKey(),
    userId: text("userId").unique(), // null for AI profiles
    username: text("username").notNull().unique(),
    displayName: text("displayName").notNull(),
    avatarUrl: text("avatarUrl"),
    coverUrl: text("coverUrl"),
    bio: text("bio"),
    karma: integer("karma").notNull().default(0),
    xp: integer("xp").notNull().default(0),
    level: integer("level").notNull().default(1),
    isAI: boolean("isAI").notNull().default(false),
    isAdmin: boolean("isAdmin").notNull().default(false),
    isBanned: boolean("isBanned").notNull().default(false),
    role: text("role").notNull().default("user"), // 'superadmin' | 'admin' | 'moderator' | 'leader' | 'verified' | 'user'
    isMuted: boolean("isMuted").notNull().default(false),
    isShadowBanned: boolean("isShadowBanned").notNull().default(false),
    bannedUntil: timestamp("bannedUntil"),
    mutedUntil: timestamp("mutedUntil"),
    customPermissions: jsonb("customPermissions").$type<Record<string, boolean>>().default({}),
    notificationSettings: jsonb("notificationSettings")
      .$type<NotificationPreferences>()
      .default(defaultNotificationPreferences),
    favoriteCategories: jsonb("favoriteCategories").$type<string[]>().default([]),
    featuredBadgeIds: jsonb("featuredBadgeIds").$type<number[]>().default([]),
    streakDays: integer("streakDays").notNull().default(0),
    lastActiveDate: date("lastActiveDate"),
    profileTheme: text("profileTheme").notNull().default("varsayilan"),
    themePreference: text("themePreference").notNull().default("system"), // 'system' | 'dark' | 'light'
    createdAt: timestamp("createdAt").notNull().defaultNow(),
  },
  (t) => [
    index("profiles_karma_idx").on(t.karma),
    index("profiles_role_idx").on(t.role),
    index("profiles_created_idx").on(t.createdAt),
    index("profiles_is_ai_idx").on(t.isAI),
  ],
)

export const aiPersonas = pgTable("ai_personas", {
  id: serial("id").primaryKey(),
  profileId: integer("profileId")
    .notNull()
    .unique()
    .references(() => profiles.id, { onDelete: "cascade" }),
  systemPrompt: text("systemPrompt").notNull(),
  writingStyle: text("writingStyle").notNull(),
  interests: jsonb("interests").$type<string[]>().notNull().default([]),
  activeHourStart: integer("activeHourStart").notNull().default(8),
  activeHourEnd: integer("activeHourEnd").notNull().default(23),
  opinionStyle: text("opinionStyle").notNull(),
  typoRate: real("typoRate").notNull().default(0.05),
  emojiStyle: text("emojiStyle").notNull().default("orta"),
  isActive: boolean("isActive").notNull().default(true),
})

export const categories = pgTable("categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  description: text("description"),
  icon: text("icon").notNull().default("hash"),
  color: text("color").notNull().default("#22d3ee"),
  topicCount: integer("topicCount").notNull().default(0),
})

export const topics = pgTable(
  "topics",
  {
    id: serial("id").primaryKey(),
    slug: text("slug").notNull().unique(),
    title: text("title").notNull(),
    content: text("content").notNull(),
    categoryId: integer("categoryId")
      .notNull()
      .references(() => categories.id, { onDelete: "cascade" }),
    authorProfileId: integer("authorProfileId")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    isAISuggested: boolean("isAISuggested").notNull().default(false),
    isHot: boolean("isHot").notNull().default(false),
    isDailyTopic: boolean("isDailyTopic").notNull().default(false),
    isDailySummary: boolean("isDailySummary").notNull().default(false),
    isPoll: boolean("isPoll").notNull().default(false),
    isPinned: boolean("isPinned").notNull().default(false),
    isLocked: boolean("isLocked").notNull().default(false),
    aiSummary: text("aiSummary"),
    viewCount: integer("viewCount").notNull().default(0),
    score: integer("score").notNull().default(0),
    commentCount: integer("commentCount").notNull().default(0),
    acceptedCommentId: integer("acceptedCommentId").references((): any => comments.id, { onDelete: "set null" }),
    createdAt: timestamp("createdAt").notNull().defaultNow(),
    lastActivityAt: timestamp("lastActivityAt").notNull().defaultNow(),
  },
  (t) => [
    index("topics_category_idx").on(t.categoryId),
    index("topics_author_idx").on(t.authorProfileId),
    index("topics_activity_idx").on(t.lastActivityAt),
    index("topics_score_idx").on(t.score),
    index("topics_created_idx").on(t.createdAt),
    index("topics_cursor_idx").on(t.isPinned, t.lastActivityAt, t.id),
  ],
)

export const comments = pgTable(
  "comments",
  {
    id: serial("id").primaryKey(),
    topicId: integer("topicId")
      .notNull()
      .references(() => topics.id, { onDelete: "cascade" }),
    parentId: integer("parentId").references((): any => comments.id, { onDelete: "cascade" }),
    authorProfileId: integer("authorProfileId")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    content: text("content").notNull(),
    score: integer("score").notNull().default(0),
    isRoast: boolean("isRoast").notNull().default(false),
    isFunny: boolean("isFunny").notNull().default(false),
    isToxic: boolean("isToxic").notNull().default(false),
    isDeleted: boolean("isDeleted").notNull().default(false),
    createdAt: timestamp("createdAt").notNull().defaultNow(),
  },
  (t) => [
    index("comments_topic_idx").on(t.topicId),
    index("comments_author_idx").on(t.authorProfileId),
    index("comments_created_idx").on(t.createdAt),
    index("comments_topic_parent_idx").on(t.topicId, t.parentId),
  ],
)

export const votes = pgTable(
  "votes",
  {
    id: serial("id").primaryKey(),
    profileId: integer("profileId")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    targetType: text("targetType").notNull(), // 'topic' | 'comment'
    targetId: integer("targetId").notNull(),
    value: integer("value").notNull(), // 1 | -1
    createdAt: timestamp("createdAt").notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("votes_unique_idx").on(t.profileId, t.targetType, t.targetId),
    index("votes_target_idx").on(t.targetType, t.targetId),
  ],
)

export const badges = pgTable("badges", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  description: text("description").notNull(),
  icon: text("icon").notNull().default("award"),
  color: text("color").notNull().default("#f59e0b"),
})

export const userBadges = pgTable(
  "user_badges",
  {
    id: serial("id").primaryKey(),
    profileId: integer("profileId")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    badgeId: integer("badgeId")
      .notNull()
      .references(() => badges.id, { onDelete: "cascade" }),
    awardedAt: timestamp("awardedAt").notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("user_badges_unique_idx").on(t.profileId, t.badgeId),
    index("user_badges_badge_idx").on(t.badgeId),
  ],
)

export const notifications = pgTable(
  "notifications",
  {
    id: serial("id").primaryKey(),
    profileId: integer("profileId")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }), // recipient
    actorProfileId: integer("actorProfileId").references(() => profiles.id, { onDelete: "set null" }),
    type: text("type").notNull(), // 'reply' | 'mention' | 'upvote' | 'badge' | 'system'
    message: text("message").notNull(),
    topicId: integer("topicId").references(() => topics.id, { onDelete: "cascade" }),
    commentId: integer("commentId").references(() => comments.id, { onDelete: "cascade" }),
    isRead: boolean("isRead").notNull().default(false),
    createdAt: timestamp("createdAt").notNull().defaultNow(),
  },
  (t) => [
    index("notifications_profile_idx").on(t.profileId),
    index("notifications_unread_idx").on(t.profileId, t.isRead),
    index("notifications_cursor_idx").on(t.profileId, t.createdAt, t.id),
  ],
)

export const tags = pgTable("tags", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
})

export const topicTags = pgTable(
  "topic_tags",
  {
    id: serial("id").primaryKey(),
    topicId: integer("topicId")
      .notNull()
      .references(() => topics.id, { onDelete: "cascade" }),
    tagId: integer("tagId")
      .notNull()
      .references(() => tags.id, { onDelete: "cascade" }),
  },
  (t) => [
    uniqueIndex("topic_tags_unique_idx").on(t.topicId, t.tagId),
    index("topic_tags_tag_idx").on(t.tagId),
  ],
)

export const polls = pgTable("polls", {
  id: serial("id").primaryKey(),
  topicId: integer("topicId")
    .notNull()
    .unique()
    .references(() => topics.id, { onDelete: "cascade" }),
  question: text("question").notNull(),
})

export const pollOptions = pgTable(
  "poll_options",
  {
    id: serial("id").primaryKey(),
    pollId: integer("pollId")
      .notNull()
      .references(() => polls.id, { onDelete: "cascade" }),
    text: text("text").notNull(),
    voteCount: integer("voteCount").notNull().default(0),
  },
  (t) => [index("poll_options_poll_idx").on(t.pollId)],
)

export const pollVotes = pgTable(
  "poll_votes",
  {
    id: serial("id").primaryKey(),
    pollId: integer("pollId")
      .notNull()
      .references(() => polls.id, { onDelete: "cascade" }),
    optionId: integer("optionId")
      .notNull()
      .references(() => pollOptions.id, { onDelete: "cascade" }),
    profileId: integer("profileId")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    createdAt: timestamp("createdAt").notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("poll_votes_unique_idx").on(t.pollId, t.profileId),
    index("poll_votes_profile_idx").on(t.profileId),
  ],
)

export const guessGameAnswers = pgTable("guess_game_answers", {
  id: serial("id").primaryKey(),
  profileId: integer("profileId").references(() => profiles.id, { onDelete: "cascade" }),
  commentId: integer("commentId").notNull().references(() => comments.id, { onDelete: "cascade" }),
  guessedAI: boolean("guessedAI").notNull(),
  correct: boolean("correct").notNull(),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
})

export const dailySummaries = pgTable(
  "daily_summaries",
  {
    id: serial("id").primaryKey(),
    summaryDate: date("summaryDate").notNull().unique(),
    topicId: integer("topicId").references(() => topics.id, { onDelete: "set null" }),
    content: text("content").notNull(),
    createdAt: timestamp("createdAt").notNull().defaultNow(),
  },
  (t) => [index("daily_summaries_topic_idx").on(t.topicId)],
)

export const reports = pgTable(
  "reports",
  {
    id: serial("id").primaryKey(),
    reporterProfileId: integer("reporterProfileId").references(() => profiles.id, { onDelete: "set null" }), // null = AI moderatör (otomatik)
    targetType: text("targetType").notNull(), // 'topic' | 'comment' | 'profile'
    targetId: integer("targetId").notNull(),
    reason: text("reason").notNull(),
    status: text("status").notNull().default("open"), // 'open' | 'resolved' | 'dismissed'
    resolutionNote: text("resolutionNote"),
    resolvedByProfileId: integer("resolvedByProfileId").references(() => profiles.id, { onDelete: "set null" }),
    resolvedAt: timestamp("resolvedAt"),
    createdAt: timestamp("createdAt").notNull().defaultNow(),
  },
  (t) => [
    index("reports_status_idx").on(t.status),
    index("reports_target_idx").on(t.targetType, t.targetId),
    index("reports_created_idx").on(t.createdAt),
  ],
)

export const siteStats = pgTable("site_stats", {
  id: serial("id").primaryKey(),
  statDate: date("statDate").notNull().unique(),
  pageViews: integer("pageViews").notNull().default(0),
  newTopics: integer("newTopics").notNull().default(0),
  newComments: integer("newComments").notNull().default(0),
  newUsers: integer("newUsers").notNull().default(0),
  aiActions: integer("aiActions").notNull().default(0),
})

export const ads = pgTable("ads", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  imageUrl: text("imageUrl"),
  linkUrl: text("linkUrl").notNull(),
  slot: text("slot").notNull().default("sidebar"), // 'sidebar' | 'feed'
  isActive: boolean("isActive").notNull().default(true),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
})

export const aiActivityLog = pgTable(
  "ai_activity_log",
  {
    id: serial("id").primaryKey(),
    personaProfileId: integer("personaProfileId")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    action: text("action").notNull(), // 'topic' | 'comment' | 'vote' | 'summary' | 'poll'
    detail: text("detail"),
    topicId: integer("topicId").references(() => topics.id, { onDelete: "cascade" }),
    commentId: integer("commentId").references(() => comments.id, { onDelete: "cascade" }),
    createdAt: timestamp("createdAt").notNull().defaultNow(),
  },
  (t) => [
    index("ai_activity_persona_idx").on(t.personaProfileId),
    index("ai_activity_created_idx").on(t.createdAt),
  ],
)

// Multiple Gemini API keys with priority-based failover rotation.
export const aiApiKeys = pgTable("ai_api_keys", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  apiKey: text("apiKey").notNull(),
  priority: integer("priority").notNull().default(0),
  isActive: boolean("isActive").notNull().default(true),
  exhaustedUntil: timestamp("exhaustedUntil"), // quota hit: skip until this time
  errorCount: integer("errorCount").notNull().default(0),
  lastUsedAt: timestamp("lastUsedAt"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
})

// Singleton row (id=1): global AI cost/quota controls.
export const aiSettings = pgTable("ai_settings", {
  id: integer("id").primaryKey().default(1),
  modelId: text("modelId").notNull().default("gemini-3.8-flash"),
  temperature: real("temperature").notNull().default(1.0),
  maxTokens: integer("maxTokens").notNull().default(2048),
  dailyActionLimit: integer("dailyActionLimit").notNull().default(50),
  isPaused: boolean("isPaused").notNull().default(false),
  pausedReason: text("pausedReason"),
  cacheTtlMinutes: integer("cacheTtlMinutes").notNull().default(1440),
  dailyUsed: integer("dailyUsed").notNull().default(0),
  usageDate: date("usageDate").notNull().default(sql`CURRENT_DATE`),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
})

export const aiResponseCache = pgTable(
  "ai_response_cache",
  {
    id: serial("id").primaryKey(),
    cacheKey: text("cacheKey").notNull().unique(),
    response: text("response").notNull(),
    hitCount: integer("hitCount").notNull().default(0),
    expiresAt: timestamp("expiresAt").notNull(),
    createdAt: timestamp("createdAt").notNull().defaultNow(),
  },
  (t) => [index("ai_cache_expires_idx").on(t.expiresAt)],
)

// Queue of real-user comments awaiting a delayed AI persona reply (5-30 min).
export const aiReplyQueue = pgTable(
  "ai_reply_queue",
  {
    id: serial("id").primaryKey(),
    commentId: integer("commentId")
      .notNull()
      .unique()
      .references(() => comments.id, { onDelete: "cascade" }),
    topicId: integer("topicId")
      .notNull()
      .references(() => topics.id, { onDelete: "cascade" }),
    authorProfileId: integer("authorProfileId")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    dueAt: timestamp("dueAt").notNull(),
    status: text("status").notNull().default("pending"), // pending | done | skipped
    createdAt: timestamp("createdAt").notNull().defaultNow(),
  },
  (t) => [index("ai_reply_queue_due_idx").on(t.status, t.dueAt)],
)

// User -> user or user -> category follows for the personalized feed.
export const follows = pgTable(
  "follows",
  {
    id: serial("id").primaryKey(),
    followerProfileId: integer("followerProfileId")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    targetType: text("targetType").notNull(), // 'user' | 'category'
    targetId: integer("targetId").notNull(),
    createdAt: timestamp("createdAt").notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("follows_unique_idx").on(t.followerProfileId, t.targetType, t.targetId),
    index("follows_target_idx").on(t.targetType, t.targetId),
  ],
)

// Server-side cache of Open Graph metadata for link preview cards.
export const linkPreviews = pgTable("link_previews", {
  id: serial("id").primaryKey(),
  url: text("url").notNull().unique(),
  title: text("title"),
  description: text("description"),
  imageUrl: text("imageUrl"),
  siteName: text("siteName"),
  fetchedAt: timestamp("fetchedAt").notNull().defaultNow(),
})

// A profile muting another profile: muted users' topics/comments are hidden.
export const userMutes = pgTable(
  "user_mutes",
  {
    id: serial("id").primaryKey(),
    profileId: integer("profileId")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    mutedProfileId: integer("mutedProfileId")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    createdAt: timestamp("createdAt").notNull().defaultNow(),
  },
  (t) => [uniqueIndex("user_mutes_unique_idx").on(t.profileId, t.mutedProfileId)],
)

// Web Push subscriptions per user for PWA notifications.
export const pushSubscriptions = pgTable("push_subscriptions", {
  id: serial("id").primaryKey(),
  profileId: integer("profileId")
    .notNull()
    .references(() => profiles.id, { onDelete: "cascade" }),
  endpoint: text("endpoint").notNull().unique(),
  p256dh: text("p256dh").notNull(),
  auth: text("auth").notNull(),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
})

// First-party page view tracking used to power admin analytics.
export const pageViews = pgTable(
  "page_views",
  {
    id: serial("id").primaryKey(),
    path: text("path").notNull(),
    topicId: integer("topicId").references(() => topics.id, { onDelete: "cascade" }),
    visitorHash: text("visitorHash").notNull(), // daily-rotating anonymous hash
    createdAt: timestamp("createdAt").notNull().defaultNow(),
  },
  (t) => [
    index("page_views_path_idx").on(t.path, t.createdAt),
    index("page_views_created_idx").on(t.createdAt),
    index("page_views_topic_idx").on(t.topicId),
  ],
)

export const rateLimits = pgTable(
  "rate_limits",
  {
    id: serial("id").primaryKey(),
    profileId: integer("profileId")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    action: text("action").notNull(), // 'topic' | 'comment' | 'vote' | 'chat'
    createdAt: timestamp("createdAt").notNull().defaultNow(),
  },
  (t) => [index("rate_limits_lookup_idx").on(t.profileId, t.action, t.createdAt)],
)

export const conversations = pgTable(
  "conversations",
  {
    id: serial("id").primaryKey(),
    participant1Id: integer("participant1Id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    participant2Id: integer("participant2Id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    lastMessageAt: timestamp("lastMessageAt").notNull().defaultNow(),
    lastMessagePreview: text("lastMessagePreview"),
    createdAt: timestamp("createdAt").notNull().defaultNow(),
  },
  (t) => [
    index("conversations_p1_idx").on(t.participant1Id),
    index("conversations_p2_idx").on(t.participant2Id),
    index("conversations_last_msg_idx").on(t.lastMessageAt),
  ],
)

export const directMessages = pgTable(
  "direct_messages",
  {
    id: serial("id").primaryKey(),
    conversationId: integer("conversationId")
      .notNull()
      .references(() => conversations.id, { onDelete: "cascade" }),
    senderProfileId: integer("senderProfileId")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    recipientProfileId: integer("recipientProfileId")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    content: text("content").notNull(),
    isRead: boolean("isRead").notNull().default(false),
    createdAt: timestamp("createdAt").notNull().defaultNow(),
  },
  (t) => [
    index("direct_messages_conv_idx").on(t.conversationId, t.createdAt),
    index("direct_messages_recipient_unread_idx").on(t.recipientProfileId, t.isRead),
  ],
)

export const commentReactions = pgTable(
  "comment_reactions",
  {
    id: serial("id").primaryKey(),
    commentId: integer("commentId")
      .notNull()
      .references(() => comments.id, { onDelete: "cascade" }),
    profileId: integer("profileId")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    emoji: text("emoji").notNull(), // '👍' | '❤️' | '🔥' | '😂' | '🚀' | '💡' | '🎉'
    createdAt: timestamp("createdAt").notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("comment_reactions_unique_idx").on(t.commentId, t.profileId, t.emoji),
    index("comment_reactions_comment_idx").on(t.commentId),
    index("comment_reactions_profile_idx").on(t.profileId),
  ],
)

export const bookmarks = pgTable(
  "bookmarks",
  {
    id: serial("id").primaryKey(),
    profileId: integer("profileId")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    topicId: integer("topicId")
      .notNull()
      .references(() => topics.id, { onDelete: "cascade" }),
    createdAt: timestamp("createdAt").notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("bookmarks_profile_topic_unique_idx").on(t.profileId, t.topicId),
    index("bookmarks_profile_idx").on(t.profileId, t.createdAt),
    index("bookmarks_topic_idx").on(t.topicId),
  ],
)

export const debates = pgTable(
  "debates",
  {
    id: serial("id").primaryKey(),
    topicId: integer("topicId")
      .notNull()
      .references(() => topics.id, { onDelete: "cascade" }),
    persona1ProfileId: integer("persona1ProfileId")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    persona2ProfileId: integer("persona2ProfileId")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    motion: text("motion").notNull(),
    rounds: jsonb("rounds")
      .$type<
        Array<{
          speakerProfileId: number
          speakerUsername: string
          speakerDisplayName: string
          speakerAvatarUrl: string | null
          speakerRole: "tez" | "antitez"
          argument: string
          roundNumber: number
          createdAt: string
        }>
      >()
      .notNull()
      .default([]),
    status: text("status").notNull().default("active"), // "active" | "completed"
    createdAt: timestamp("createdAt").notNull().defaultNow(),
  },
  (t) => [
    index("debates_topic_idx").on(t.topicId),
    index("debates_created_idx").on(t.createdAt),
  ],
)

export const newsletterSubscribers = pgTable(
  "newsletter_subscribers",
  {
    id: serial("id").primaryKey(),
    email: text("email").notNull().unique(),
    profileId: integer("profileId").references(() => profiles.id, { onDelete: "set null" }),
    isActive: boolean("isActive").notNull().default(true),
    createdAt: timestamp("createdAt").notNull().defaultNow(),
  },
  (t) => [index("newsletter_email_idx").on(t.email)],
)

export const topicReads = pgTable(
  "topic_reads",
  {
    id: serial("id").primaryKey(),
    profileId: integer("profileId")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    topicId: integer("topicId")
      .notNull()
      .references(() => topics.id, { onDelete: "cascade" }),
    readAt: timestamp("readAt").notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("topic_reads_user_topic_idx").on(t.profileId, t.topicId),
    index("topic_reads_profile_idx").on(t.profileId),
  ],
)

// Spam & Kelime Filtresi (Blacklist): Yasaklı kelimeler, domainler, regex desenleri
export const spamFilters = pgTable(
  "spam_filters",
  {
    id: serial("id").primaryKey(),
    pattern: text("pattern").notNull(), // kelime, domain veya regex ifadesi
    type: text("type").notNull().default("word"), // 'word' | 'domain' | 'regex'
    action: text("action").notNull().default("block"), // 'block' | 'censor' | 'flag'
    replacement: text("replacement").default("***"),
    hitCount: integer("hitCount").notNull().default(0),
    isActive: boolean("isActive").notNull().default(true),
    createdAt: timestamp("createdAt").notNull().defaultNow(),
  },
  (t) => [index("spam_filters_pattern_idx").on(t.pattern)],
)

// İçerik Sürüm Geçmişi (Edit History): Konu ve yorumların değişiklik kayıtları
export const contentRevisions = pgTable(
  "content_revisions",
  {
    id: serial("id").primaryKey(),
    targetType: text("targetType").notNull(), // 'topic' | 'comment'
    targetId: integer("targetId").notNull(),
    previousTitle: text("previousTitle"),
    previousContent: text("previousContent").notNull(),
    newContent: text("newContent"),
    editedByProfileId: integer("editedByProfileId")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    reason: text("reason"),
    createdAt: timestamp("createdAt").notNull().defaultNow(),
  },
  (t) => [
    index("content_revisions_target_idx").on(t.targetType, t.targetId),
    index("content_revisions_created_idx").on(t.createdAt),
  ],
)

// Ceza & Askıya Alma (Bans / Mutes / Shadowbans / IP Bans)
export const userPenalties = pgTable(
  "user_penalties",
  {
    id: serial("id").primaryKey(),
    targetProfileId: integer("targetProfileId")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    moderatorProfileId: integer("moderatorProfileId").references(() => profiles.id, { onDelete: "set null" }),
    actionType: text("actionType").notNull(), // 'ban' | 'mute' | 'shadowban' | 'warn' | 'ipban'
    reason: text("reason").notNull(),
    durationHours: integer("durationHours"), // null = süresiz
    expiresAt: timestamp("expiresAt"), // null = süresiz
    ipAddress: text("ipAddress"),
    isActive: boolean("isActive").notNull().default(true),
    createdAt: timestamp("createdAt").notNull().defaultNow(),
  },
  (t) => [
    index("user_penalties_target_idx").on(t.targetProfileId, t.isActive),
    index("user_penalties_action_idx").on(t.actionType),
  ],
)

// Bülten Gönderim & Taslak Yönetimi
export const newsletters = pgTable(
  "newsletters",
  {
    id: serial("id").primaryKey(),
    title: text("title").notNull(),
    content: text("content").notNull(),
    status: text("status").notNull().default("draft"), // 'draft' | 'sent'
    sentAt: timestamp("sentAt"),
    recipientCount: integer("recipientCount").notNull().default(0),
    createdAt: timestamp("createdAt").notNull().defaultNow(),
    updatedAt: timestamp("updatedAt").notNull().defaultNow(),
  },
  (t) => [index("newsletters_status_idx").on(t.status)],
)

// Önemli Duyuru Banner'ı: Sitenin tepesinde acil/önemli duyuru
export const announcements = pgTable(
  "announcements",
  {
    id: serial("id").primaryKey(),
    title: text("title").notNull(),
    message: text("message").notNull(),
    linkUrl: text("linkUrl"),
    linkText: text("linkText"),
    bannerType: text("bannerType").notNull().default("info"), // 'info' | 'warning' | 'critical' | 'event'
    isActive: boolean("isActive").notNull().default(true),
    createdAt: timestamp("createdAt").notNull().defaultNow(),
  },
  (t) => [index("announcements_active_idx").on(t.isActive)],
)

// Zamanlanmış Görevler (Cron Jobs) Yönetimi & Ayarları
export const cronJobs = pgTable("cron_jobs", {
  id: text("id").primaryKey(), // 'daily-topic' | 'daily-summary' | 'ai-activity' | 'process-replies'
  name: text("name").notNull(),
  description: text("description").notNull(),
  schedule: text("schedule").notNull(), // örn: "0 9 * * *"
  endpoint: text("endpoint").notNull(), // örn: "/api/cron/daily-topic"
  isEnabled: boolean("isEnabled").notNull().default(true),
  lastRunAt: timestamp("lastRunAt"),
  lastStatus: text("lastStatus").notNull().default("idle"), // 'success' | 'failed' | 'running' | 'idle'
  lastError: text("lastError"),
  lastResultSummary: text("lastResultSummary"),
  runCount: integer("runCount").notNull().default(0),
  nextScheduledAt: timestamp("nextScheduledAt"),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
})

export const cronJobLogs = pgTable(
  "cron_job_logs",
  {
    id: serial("id").primaryKey(),
    cronJobId: text("cronJobId").notNull().references(() => cronJobs.id, { onDelete: "cascade" }),
    status: text("status").notNull(), // 'success' | 'failed' | 'running'
    durationMs: integer("durationMs"),
    message: text("message"),
    output: jsonb("output"),
    createdAt: timestamp("createdAt").notNull().defaultNow(),
  },
  (t) => [index("cron_job_logs_job_idx").on(t.cronJobId, t.createdAt)],
)

// --- Relations -------------------------------------------------------------

export const profilesRelations = relations(profiles, ({ one, many }) => ({
  topics: many(topics),
  comments: many(comments),
  votes: many(votes),
  badges: many(userBadges),
  notifications: many(notifications),
  aiPersona: one(aiPersonas, {
    fields: [profiles.id],
    references: [aiPersonas.profileId],
  }),
  bookmarks: many(bookmarks),
  reactions: many(commentReactions),
  reads: many(topicReads),
}))

export const topicsRelations = relations(topics, ({ one, many }) => ({
  category: one(categories, {
    fields: [topics.categoryId],
    references: [categories.id],
  }),
  author: one(profiles, {
    fields: [topics.authorProfileId],
    references: [profiles.id],
  }),
  comments: many(comments),
  tags: many(topicTags),
  bookmarks: many(bookmarks),
  poll: one(polls, {
    fields: [topics.id],
    references: [polls.topicId],
  }),
  reads: many(topicReads),
}))

export const commentsRelations = relations(comments, ({ one, many }) => ({
  topic: one(topics, {
    fields: [comments.topicId],
    references: [topics.id],
  }),
  author: one(profiles, {
    fields: [comments.authorProfileId],
    references: [profiles.id],
  }),
  parent: one(comments, {
    fields: [comments.parentId],
    references: [comments.id],
    relationName: "comment_replies",
  }),
  children: many(comments, {
    relationName: "comment_replies",
  }),
  reactions: many(commentReactions),
}))

export const categoriesRelations = relations(categories, ({ many }) => ({
  topics: many(topics),
}))

export const badgesRelations = relations(badges, ({ many }) => ({
  users: many(userBadges),
}))

export const userBadgesRelations = relations(userBadges, ({ one }) => ({
  profile: one(profiles, {
    fields: [userBadges.profileId],
    references: [profiles.id],
  }),
  badge: one(badges, {
    fields: [userBadges.badgeId],
    references: [badges.id],
  }),
}))

export const cronJobsRelations = relations(cronJobs, ({ many }) => ({
  logs: many(cronJobLogs),
}))

export const cronJobLogsRelations = relations(cronJobLogs, ({ one }) => ({
  cronJob: one(cronJobs, {
    fields: [cronJobLogs.cronJobId],
    references: [cronJobs.id],
  }),
}))

export const votesRelations = relations(votes, ({ one }) => ({
  profile: one(profiles, {
    fields: [votes.profileId],
    references: [profiles.id],
  }),
}))

export const notificationsRelations = relations(notifications, ({ one }) => ({
  profile: one(profiles, {
    fields: [notifications.profileId],
    references: [profiles.id],
  }),
  actorProfile: one(profiles, {
    fields: [notifications.actorProfileId],
    references: [profiles.id],
  }),
  topic: one(topics, {
    fields: [notifications.topicId],
    references: [topics.id],
  }),
  comment: one(comments, {
    fields: [notifications.commentId],
    references: [comments.id],
  }),
}))

export const bookmarksRelations = relations(bookmarks, ({ one }) => ({
  profile: one(profiles, {
    fields: [bookmarks.profileId],
    references: [profiles.id],
  }),
  topic: one(topics, {
    fields: [bookmarks.topicId],
    references: [topics.id],
  }),
}))

export const commentReactionsRelations = relations(commentReactions, ({ one }) => ({
  profile: one(profiles, {
    fields: [commentReactions.profileId],
    references: [profiles.id],
  }),
  comment: one(comments, {
    fields: [commentReactions.commentId],
    references: [comments.id],
  }),
}))

export const tagsRelations = relations(tags, ({ many }) => ({
  topics: many(topicTags),
}))

export const topicTagsRelations = relations(topicTags, ({ one }) => ({
  topic: one(topics, {
    fields: [topicTags.topicId],
    references: [topics.id],
  }),
  tag: one(tags, {
    fields: [topicTags.tagId],
    references: [tags.id],
  }),
}))

export const pollsRelations = relations(polls, ({ one, many }) => ({
  topic: one(topics, {
    fields: [polls.topicId],
    references: [topics.id],
  }),
  options: many(pollOptions),
  votes: many(pollVotes),
}))

export const pollOptionsRelations = relations(pollOptions, ({ one, many }) => ({
  poll: one(polls, {
    fields: [pollOptions.pollId],
    references: [polls.id],
  }),
  votes: many(pollVotes),
}))

export const pollVotesRelations = relations(pollVotes, ({ one }) => ({
  poll: one(polls, {
    fields: [pollVotes.pollId],
    references: [polls.id],
  }),
  option: one(pollOptions, {
    fields: [pollVotes.optionId],
    references: [pollOptions.id],
  }),
  profile: one(profiles, {
    fields: [pollVotes.profileId],
    references: [profiles.id],
  }),
}))

export const conversationsRelations = relations(conversations, ({ one, many }) => ({
  participant1: one(profiles, {
    fields: [conversations.participant1Id],
    references: [profiles.id],
  }),
  participant2: one(profiles, {
    fields: [conversations.participant2Id],
    references: [profiles.id],
  }),
  messages: many(directMessages),
}))

export const directMessagesRelations = relations(directMessages, ({ one }) => ({
  conversation: one(conversations, {
    fields: [directMessages.conversationId],
    references: [conversations.id],
  }),
  sender: one(profiles, {
    fields: [directMessages.senderProfileId],
    references: [profiles.id],
  }),
  recipient: one(profiles, {
    fields: [directMessages.recipientProfileId],
    references: [profiles.id],
  }),
}))

export const debatesRelations = relations(debates, ({ one }) => ({
  topic: one(topics, {
    fields: [debates.topicId],
    references: [topics.id],
  }),
  persona1: one(profiles, {
    fields: [debates.persona1ProfileId],
    references: [profiles.id],
  }),
  persona2: one(profiles, {
    fields: [debates.persona2ProfileId],
    references: [profiles.id],
  }),
}))

export const contentRevisionsRelations = relations(contentRevisions, ({ one }) => ({
  editor: one(profiles, {
    fields: [contentRevisions.editedByProfileId],
    references: [profiles.id],
  }),
}))

export const userPenaltiesRelations = relations(userPenalties, ({ one }) => ({
  targetProfile: one(profiles, {
    fields: [userPenalties.targetProfileId],
    references: [profiles.id],
  }),
  moderatorProfile: one(profiles, {
    fields: [userPenalties.moderatorProfileId],
    references: [profiles.id],
  }),
}))

export const topicReadsRelations = relations(topicReads, ({ one }) => ({
  profile: one(profiles, {
    fields: [topicReads.profileId],
    references: [profiles.id],
  }),
  topic: one(topics, {
    fields: [topicReads.topicId],
    references: [topics.id],
  }),
}))

// Site-wide Configuration & Defaults (Singleton row: id='site_config')
export const siteSettings = pgTable("site_settings", {
  id: text("id").primaryKey().default("site_config"),
  defaultTheme: text("defaultTheme").notNull().default("system"), // 'system' | 'dark' | 'light'
  googleAnalyticsId: text("googleAnalyticsId"), // e.g. G-XXXXXXXXXX
  googleSearchConsoleCode: text("googleSearchConsoleCode"), // verification meta tag content or HTML tag
  googleAdsenseId: text("googleAdsenseId"), // e.g. ca-pub-XXXXXXXXXXXXXXXX
  googleTagManagerId: text("googleTagManagerId"), // e.g. GTM-XXXXXXX
  customHeadCode: text("customHeadCode"), // Custom HTML / scripts inserted in <head>
  customBodyCode: text("customBodyCode"), // Custom HTML / scripts inserted before </body>
  siteTitle: text("siteTitle"),
  siteDescription: text("siteDescription"),
  robotsTxt: text("robotsTxt"),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
})








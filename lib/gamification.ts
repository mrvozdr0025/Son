import "server-only"
import { db } from "@/lib/db"
import { badges, comments, notifications, profiles, topics, userBadges, votes } from "@/lib/db/schema"
import { and, desc, eq, gte, sql } from "drizzle-orm"
import {
  LEVEL_TIERS,
  getLevelTier,
  getLevelFromXp,
  getLevelProgressInfo,
  type LevelTier,
  type LevelProgressInfo,
} from "./level-tiers"

export {
  LEVEL_TIERS,
  getLevelTier,
  getLevelFromXp,
  getLevelProgressInfo,
  type LevelTier,
  type LevelProgressInfo,
}

// ---------------------------------------------------------------- Streaks --

// Called whenever a user performs an activity (comment/topic).
// Consecutive-day activity increases the streak; a gap resets it to 1.
export async function touchStreak(profileId: number) {
  await db.execute(sql`
    UPDATE profiles SET
      "streakDays" = CASE
        WHEN "lastActiveDate" = CURRENT_DATE THEN "streakDays"
        WHEN "lastActiveDate" = CURRENT_DATE - 1 THEN "streakDays" + 1
        ELSE 1
      END,
      "lastActiveDate" = CURRENT_DATE
    WHERE id = ${profileId}
  `)
}

// ---------------------------------------------------------- Weekly quests --

export type Quest = {
  id: string
  title: string
  description: string
  target: number
  progress: number
  done: boolean
}

function weekStart(): Date {
  const now = new Date()
  const day = (now.getDay() + 6) % 7 // Monday = 0
  const start = new Date(now)
  start.setDate(now.getDate() - day)
  start.setHours(0, 0, 0, 0)
  return start
}

// Progress is computed live from existing tables — no extra quest state.
export async function getWeeklyQuests(profileId: number): Promise<Quest[]> {
  const since = weekStart()

  const [[commentRow], [topicRow], [voteRow], [catRow]] = await Promise.all([
    db
      .select({ c: sql<number>`count(*)::int` })
      .from(comments)
      .where(and(eq(comments.authorProfileId, profileId), gte(comments.createdAt, since))),
    db
      .select({ c: sql<number>`count(*)::int` })
      .from(topics)
      .where(and(eq(topics.authorProfileId, profileId), gte(topics.createdAt, since))),
    db
      .select({ c: sql<number>`count(*)::int` })
      .from(votes)
      .where(and(eq(votes.profileId, profileId), gte(votes.createdAt, since))),
    db
      .select({ c: sql<number>`count(distinct ${topics.categoryId})::int` })
      .from(comments)
      .innerJoin(topics, eq(comments.topicId, topics.id))
      .where(and(eq(comments.authorProfileId, profileId), gte(comments.createdAt, since))),
  ])

  const defs = [
    { id: "yorum5", title: "Sohbet Canavarı", description: "Bu hafta 5 yorum yaz", target: 5, progress: commentRow?.c ?? 0 },
    { id: "konu1", title: "Gündem Belirleyici", description: "Bu hafta 1 konu aç", target: 1, progress: topicRow?.c ?? 0 },
    { id: "oy10", title: "Cömert Oylayıcı", description: "Bu hafta 10 oy ver", target: 10, progress: voteRow?.c ?? 0 },
    { id: "kat3", title: "Gezgin", description: "3 farklı kategoride yorum yap", target: 3, progress: catRow?.c ?? 0 },
  ]

  return defs.map((d) => ({
    ...d,
    progress: Math.min(d.progress, d.target),
    done: d.progress >= d.target,
  }))
}

// ------------------------------------------------------------ Leaderboard --

function seasonStart(): Date {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), 1)
}

export function seasonLabel(): string {
  const aylar = [
    "Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran",
    "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık",
  ]
  const now = new Date()
  return `${aylar[now.getMonth()]} ${now.getFullYear()} Sezonu`
}

// Seasonal score = points from topics + comments created this season.
export async function getSeasonalLeaderboard(limit = 10) {
  const since = seasonStart()
  const rows = await db.execute(sql`
    SELECT p.id, p.username, p."displayName", p."avatarUrl", p."isAI", p."streakDays",
      (
        COALESCE((SELECT SUM(t.score) + COUNT(*) * 2 FROM topics t
          WHERE t."authorProfileId" = p.id AND t."createdAt" >= ${since}), 0)
        +
        COALESCE((SELECT SUM(c.score) + COUNT(*) FROM comments c
          WHERE c."authorProfileId" = p.id AND c."createdAt" >= ${since} AND c."isDeleted" = false), 0)
      )::int AS season_score
    FROM profiles p
    WHERE p."isBanned" = false
    ORDER BY season_score DESC
    LIMIT ${limit}
  `)
  return (rows.rows as unknown as Array<{
    id: number
    username: string
    displayName: string
    avatarUrl: string | null
    isAI: boolean
    streakDays: number
    season_score: number
  }>).filter((r) => r.season_score > 0)
}

export async function getAllTimeLeaderboard(limit = 10) {
  return db
    .select({
      id: profiles.id,
      username: profiles.username,
      displayName: profiles.displayName,
      avatarUrl: profiles.avatarUrl,
      isAI: profiles.isAI,
      karma: profiles.karma,
      streakDays: profiles.streakDays,
    })
    .from(profiles)
    .where(eq(profiles.isBanned, false))
    .orderBy(desc(profiles.karma))
    .limit(limit)
}

// ----------------------------------------------------------------- Themes --

export type ProfileTheme = {
  id: string
  name: string
  minKarma: number
  gradient: string // CSS background for profile header
  accent: string
}

export const PROFILE_THEMES: ProfileTheme[] = [
  {
    id: "varsayilan",
    name: "Varsayılan",
    minKarma: 0,
    gradient: "linear-gradient(135deg, oklch(0.18 0.02 250), oklch(0.22 0.03 250))",
    accent: "#22d3ee",
  },
  {
    id: "gece",
    name: "Gece Mavisi",
    minKarma: 25,
    gradient: "linear-gradient(135deg, oklch(0.15 0.05 260), oklch(0.25 0.09 230))",
    accent: "#60a5fa",
  },
  {
    id: "kor",
    name: "Kor Ateşi",
    minKarma: 100,
    gradient: "linear-gradient(135deg, oklch(0.16 0.05 30), oklch(0.28 0.11 45))",
    accent: "#fb923c",
  },
  {
    id: "zumrut",
    name: "Zümrüt",
    minKarma: 250,
    gradient: "linear-gradient(135deg, oklch(0.15 0.04 160), oklch(0.27 0.09 155))",
    accent: "#34d399",
  },
  {
    id: "efsane",
    name: "Efsane (Altın)",
    minKarma: 500,
    gradient: "linear-gradient(135deg, oklch(0.18 0.05 85), oklch(0.32 0.11 80))",
    accent: "#fbbf24",
  },
]

export function getTheme(id: string): ProfileTheme {
  return PROFILE_THEMES.find((t) => t.id === id) ?? PROFILE_THEMES[0]
}

// ------------------------------------------------------------- Level & Badges --

export async function awardGamificationXp(
  profileId: number,
  amount: number,
  reason?: string
): Promise<{ leveledUp: boolean; newLevel: number; newTitle: string }> {
  const [profile] = await db
    .select({ xp: profiles.xp, level: profiles.level })
    .from(profiles)
    .where(eq(profiles.id, profileId))
    .limit(1)

  if (!profile) return { leveledUp: false, newLevel: 1, newTitle: "Çaylak" }

  const nextXp = Math.max(0, (profile.xp ?? 0) + amount)
  const newLevel = getLevelFromXp(nextXp)
  const leveledUp = newLevel > (profile.level ?? 1)
  const newTier = getLevelTier(newLevel)

  await db
    .update(profiles)
    .set({
      xp: nextXp,
      level: newLevel,
    })
    .where(eq(profiles.id, profileId))

  if (leveledUp) {
    await db.insert(notifications).values({
      profileId,
      type: "system",
      message: `🎉 Tebrikler! Seviye atladın: Seviye ${newLevel} - ${newTier.title}`,
    })

    // Check level-based badges
    if (newLevel >= 5) {
      await tryAwardBadge(profileId, "seviye-5")
    }
    if (newLevel >= 6) {
      await tryAwardBadge(profileId, "siber-ustat")
    }
  }

  return { leveledUp, newLevel, newTitle: newTier.title }
}

export async function tryAwardBadge(profileId: number, badgeSlug: string) {
  const [badge] = await db.select().from(badges).where(eq(badges.slug, badgeSlug)).limit(1)
  if (!badge) return false

  const inserted = await db
    .insert(userBadges)
    .values({ profileId, badgeId: badge.id })
    .onConflictDoNothing()
    .returning()

  if (inserted.length > 0) {
    await db.insert(notifications).values({
      profileId,
      type: "badge",
      message: `🏆 Yeni rozet kazandın: "${badge.name}" (${badge.description})`,
    })
    return true
  }
  return false
}

export async function checkAndAwardUserGamification(profileId: number) {
  const [profile] = await db.select().from(profiles).where(eq(profiles.id, profileId)).limit(1)
  if (!profile) return

  // Count user statistics
  const [[topicCountRow], [commentCountRow], [solutionsCountRow]] = await Promise.all([
    db.select({ count: sql<number>`count(*)::int` }).from(topics).where(eq(topics.authorProfileId, profileId)),
    db.select({ count: sql<number>`count(*)::int` }).from(comments).where(eq(comments.authorProfileId, profileId)),
    db.select({ count: sql<number>`count(*)::int` }).from(topics).where(eq(topics.acceptedCommentId, profileId)),
  ])

  const topicCount = topicCountRow?.count ?? 0
  const commentCount = commentCountRow?.count ?? 0

  if (topicCount >= 1) await tryAwardBadge(profileId, "ilk-konu")
  if (commentCount >= 1) await tryAwardBadge(profileId, "ilk-yorum")
  if (commentCount >= 50) await tryAwardBadge(profileId, "tartisma-ustasi")
  if (profile.karma >= 100) await tryAwardBadge(profileId, "100-karma")
}


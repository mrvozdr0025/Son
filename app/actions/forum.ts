"use server"

import { db } from "@/lib/db"
import {
  aiReplyQueue,
  badges,
  categories,
  comments,
  notifications,
  pollOptions,
  polls,
  pollVotes,
  profiles,
  reports,
  tags,
  topics,
  topicTags,
  userBadges,
  userMutes,
  votes,
  follows,
} from "@/lib/db/schema"
import { moderateComment } from "@/lib/ai/moderate"
import { slugify } from "@/lib/format"
import { touchStreak, awardGamificationXp } from "@/lib/gamification"
import { geminiText } from "@/lib/ai/gemini"
import { sendPushToProfile } from "@/lib/push"
import { checkRateLimit } from "@/lib/rate-limit"
import { requireProfile } from "@/lib/session"
import { and, eq, inArray, sql } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { after } from "next/server"

// --- helpers ----------------------------------------------------------------

async function awardBadge(profileId: number, badgeSlug: string) {
  const [badge] = await db.select().from(badges).where(eq(badges.slug, badgeSlug)).limit(1)
  if (!badge) return
  const inserted = await db
    .insert(userBadges)
    .values({ profileId, badgeId: badge.id })
    .onConflictDoNothing()
    .returning()
  if (inserted.length > 0) {
    await db.insert(notifications).values({
      profileId,
      type: "badge",
      message: `Yeni rozet kazandın: ${badge.name}`,
    })
  }
}

async function addXp(profileId: number, amount: number) {
  await awardGamificationXp(profileId, amount)
}

function sanitize(text: string, maxLen: number): string {
  const clean = text.replace(/<[^>]*>/g, "").trim()
  if (!clean) throw new Error("İçerik boş olamaz")
  if (clean.length > maxLen) throw new Error(`En fazla ${maxLen} karakter`)
  return clean
}

// Upsert tags by slug and attach them to a topic.
export async function attachTags(topicId: number, names: string[]) {
  for (const name of names) {
    const tagSlug = slugify(name)
    if (!tagSlug) continue
    const [tag] = await db
      .insert(tags)
      .values({ name, slug: tagSlug })
      .onConflictDoUpdate({ target: tags.slug, set: { name } })
      .returning()
    await db.insert(topicTags).values({ topicId, tagId: tag.id }).onConflictDoNothing()
  }
}

// AI-powered tag suggestion for topics
export async function suggestTagsWithAI(title: string, content: string, categoryId?: string): Promise<string[]> {
  await requireProfile()
  if (!title || title.trim().length < 4) {
    throw new Error("Etiket önerisi almak için en az 4 karakterlik bir başlık yazmalısın.")
  }

  let catName = ""
  if (categoryId) {
    const catIdNum = Number(categoryId)
    if (!Number.isNaN(catIdNum)) {
      const [c] = await db
        .select({ name: categories.name })
        .from(categories)
        .where(eq(categories.id, catIdNum))
        .limit(1)
      if (c) catName = c.name
    }
  }

  const raw = await geminiText({
    system: "Sen bir forum moderatörü ve etiket uzmanısın. Kullanıcının açtığı konuya en uygun, kısa ve aranabilir 2-5 adet Türkçe forum etiketi üret. Sadece etiketleri virgülle ayırarak yaz (örn: teknoloji, yazilim, yapay-zeka). Başka hiçbir kelime, format veya açıklama yazma.",
    prompt: `Kategori: ${catName || "Genel"}\nBaşlık: ${title}\nİçerik özeti: ${(content || "").slice(0, 1000)}`,
    temperature: 0.5,
  })

  const list = raw
    .split(/[,#|;\n]/)
    .map((t) => t.trim().toLowerCase().replace(/^[#\s]+/, "").replace(/\s+/g, "-"))
    .filter((t) => t.length >= 2 && t.length <= 30)

  return Array.from(new Set(list)).slice(0, 5)
}

// --- topic ------------------------------------------------------------------

export async function createTopic(formData: FormData) {
  const profile = await requireProfile()
  if (profile.isMuted) {
    throw new Error("Hesabınız susturulmuştur (yalnızca okuma modu). Yeni konu açamazsınız.")
  }
  await checkRateLimit(profile.id, "topic")

  let title = sanitize(String(formData.get("title") ?? ""), 200)
  let content = sanitize(String(formData.get("content") ?? ""), 10000)
  const categoryId = Number(formData.get("categoryId"))
  if (title.length < 10) throw new Error("Başlık en az 10 karakter olmalı")

  // Spam & Blacklist Filter Check
  const { checkAndFilterContent } = await import("@/lib/spam")
  const spamCheck = await checkAndFilterContent(content, title)
  if (!spamCheck.allowed) {
    throw new Error(spamCheck.blockedReason || "İçeriğiniz güvenlik ve spam filtremiz tarafından engellendi.")
  }
  content = spamCheck.filteredContent
  if (spamCheck.filteredTitle) title = spamCheck.filteredTitle

  const [category] = await db.select().from(categories).where(eq(categories.id, categoryId)).limit(1)
  if (!category) throw new Error("Geçersiz kategori")

  // Optional poll: question + 2-6 options
  const pollQuestion = String(formData.get("pollQuestion") ?? "").trim()
  const pollOptionsRaw = formData
    .getAll("pollOption")
    .map((o) => String(o).trim())
    .filter(Boolean)
  const hasPoll = pollQuestion.length > 0 && pollOptionsRaw.length >= 2
  if (pollQuestion && pollOptionsRaw.length < 2) {
    throw new Error("Anket için en az 2 seçenek gerekli")
  }
  if (pollOptionsRaw.length > 6) throw new Error("En fazla 6 anket seçeneği")

  // Optional tags: comma separated, max 5
  const tagsRaw = String(formData.get("tags") ?? "")
    .split(",")
    .map((t) => t.trim().replace(/^#/, "").slice(0, 30))
    .filter((t) => t.length >= 2)
    .slice(0, 5)

  const slug = `${slugify(title)}-${Math.random().toString(36).slice(2, 7)}`
  const [topic] = await db
    .insert(topics)
    .values({ slug, title, content, categoryId, authorProfileId: profile.id, isPoll: hasPoll })
    .returning()

  if (hasPoll) {
    const [poll] = await db
      .insert(polls)
      .values({ topicId: topic.id, question: pollQuestion.slice(0, 200) })
      .returning()
    await db.insert(pollOptions).values(
      pollOptionsRaw.map((text) => ({ pollId: poll.id, text: text.slice(0, 100) })),
    )
  }

  if (tagsRaw.length > 0) {
    await attachTags(topic.id, tagsRaw)
  }

  await db
    .update(categories)
    .set({ topicCount: sql`${categories.topicCount} + 1` })
    .where(eq(categories.id, categoryId))
  await addXp(profile.id, 15)
  await awardBadge(profile.id, "ilk-konu")
  if (!profile.isAI) await touchStreak(profile.id)

  revalidatePath("/")
  redirect(`/konu/${topic.slug}`)
}

// --- mute ---------------------------------------------------------------------

export async function toggleMute(mutedProfileId: number) {
  const profile = await requireProfile()
  if (profile.id === mutedProfileId) throw new Error("Kendini sessize alamazsın")

  const existing = await db
    .select({ id: userMutes.id })
    .from(userMutes)
    .where(and(eq(userMutes.profileId, profile.id), eq(userMutes.mutedProfileId, mutedProfileId)))
    .limit(1)

  let muted: boolean
  if (existing.length > 0) {
    await db.delete(userMutes).where(eq(userMutes.id, existing[0].id))
    muted = false
  } else {
    await db
      .insert(userMutes)
      .values({ profileId: profile.id, mutedProfileId })
      .onConflictDoNothing()
    muted = true
  }

  revalidatePath("/")
  return { muted }
}

// --- best answer ----------------------------------------------------------------

export async function acceptComment(topicId: number, commentId: number | null) {
  const profile = await requireProfile()

  const [topic] = await db.select().from(topics).where(eq(topics.id, topicId)).limit(1)
  if (!topic) throw new Error("Konu bulunamadı")
  if (topic.authorProfileId !== profile.id && !profile.isAdmin) {
    throw new Error("Sadece konu sahibi en iyi cevabı seçebilir")
  }

  if (commentId !== null) {
    const [comment] = await db
      .select()
      .from(comments)
      .where(and(eq(comments.id, commentId), eq(comments.topicId, topicId)))
      .limit(1)
    if (!comment || comment.isDeleted) throw new Error("Yorum bulunamadı")
    if (comment.authorProfileId === profile.id) {
      throw new Error("Kendi yorumunu en iyi cevap seçemezsin")
    }
    // Reward the answer author: +25 XP, +10 Karma, and a notification.
    await addXp(comment.authorProfileId, 25)
    await db
      .update(profiles)
      .set({ karma: sql`${profiles.karma} + 10` })
      .where(eq(profiles.id, comment.authorProfileId))

    // Award "cozum-mimari" badge
    await awardBadge(comment.authorProfileId, "cozum-mimari")

    await db.insert(notifications).values({
      profileId: comment.authorProfileId,
      actorProfileId: profile.id,
      type: "accept",
      message: `${profile.displayName} cevabını "En İyi Cevap / Çözüm" seçti (+25 XP, +10 Karma)`,
      topicId,
      commentId,
    })
  }

  await db
    .update(topics)
    .set({ acceptedCommentId: commentId })
    .where(eq(topics.id, topicId))

  revalidatePath(`/konu/${topic.slug}`)
}

// --- comment ------------------------------------------------------------------

export async function createComment(topicId: number, parentId: number | null, content: string) {
  const profile = await requireProfile()
  if (profile.isMuted) {
    throw new Error("Hesabınız susturulmuştur (yalnızca okuma modu). Yorum yazamazsınız.")
  }
  await checkRateLimit(profile.id, "comment")

  let clean = sanitize(content, 5000)
  const [topic] = await db.select().from(topics).where(eq(topics.id, topicId)).limit(1)
  if (!topic) throw new Error("Konu bulunamadı")
  if (topic.isLocked) throw new Error("Bu konu kilitli")

  // Spam & Blacklist Filter Check
  const { checkAndFilterContent } = await import("@/lib/spam")
  const spamCheck = await checkAndFilterContent(clean)
  if (!spamCheck.allowed) {
    throw new Error(spamCheck.blockedReason || "Yorumunuz güvenlik ve spam filtremiz tarafından engellendi.")
  }
  clean = spamCheck.filteredContent

  const [comment] = await db
    .insert(comments)
    .values({ topicId, parentId, authorProfileId: profile.id, content: clean })
    .returning()

  await db
    .update(topics)
    .set({
      commentCount: sql`${topics.commentCount} + 1`,
      lastActivityAt: new Date(),
    })
    .where(eq(topics.id, topicId))

  await addXp(profile.id, 5)
  await awardBadge(profile.id, "ilk-yorum")
  if (!profile.isAI) await touchStreak(profile.id)

  // Notify topic author (or parent comment author on reply)
  let recipientId = topic.authorProfileId
  if (parentId) {
    const [parent] = await db.select().from(comments).where(eq(comments.id, parentId)).limit(1)
    if (parent) recipientId = parent.authorProfileId
  }
  if (recipientId !== profile.id) {
    const pushMessage = parentId
      ? `${profile.displayName} yorumuna cevap verdi`
      : `${profile.displayName} konuna yorum yaptı`
    await db.insert(notifications).values({
      profileId: recipientId,
      actorProfileId: profile.id,
      type: "reply",
      message: pushMessage,
      topicId,
      commentId: comment.id,
    })
    // Web push: fire-and-forget after the response is sent
    const pushRecipient = recipientId
    after(() =>
      sendPushToProfile(pushRecipient, {
        title: "neonsform",
        body: pushMessage,
        url: `/konu/${topic.slug}`,
      }),
    )
  }

  // @mention notifications: find @username tokens and notify each mentioned user
  const mentioned = [...new Set(clean.match(/@([a-z0-9_]{2,24})/gi)?.map((m) => m.slice(1).toLowerCase()) ?? [])]
  if (mentioned.length > 0) {
    const mentionedProfiles = await db
      .select({ id: profiles.id, username: profiles.username })
      .from(profiles)
      .where(inArray(profiles.username, mentioned))
    for (const mp of mentionedProfiles) {
      if (mp.id === profile.id || mp.id === recipientId) continue
      await db.insert(notifications).values({
        profileId: mp.id,
        actorProfileId: profile.id,
        type: "mention",
        message: `${profile.displayName} bir yorumda senden bahsetti`,
        topicId,
        commentId: comment.id,
      })
    }
  }

  // Topic followers notification: notify users subscribed to this topic
  const topicFollowers = await db
    .select({ followerId: follows.followerProfileId })
    .from(follows)
    .where(
      and(
        eq(follows.targetType, "topic"),
        eq(follows.targetId, topicId)
      )
    )

  const notifiedIds = new Set([
    profile.id,
    recipientId,
    ...mentioned.map((m) => m.toLowerCase()),
  ])

  for (const tf of topicFollowers) {
    if (notifiedIds.has(tf.followerId)) continue
    notifiedIds.add(tf.followerId)

    const topicMsg = `${profile.displayName} takip ettiğin "${topic.title.slice(0, 30)}..." konusuna yorum yaptı`
    await db.insert(notifications).values({
      profileId: tf.followerId,
      actorProfileId: profile.id,
      type: "topic_update",
      message: topicMsg,
      topicId,
      commentId: comment.id,
    })

    const targetSub = tf.followerId
    after(() => {
      sendPushToProfile(targetSub, {
        title: "Konu Güncellemesi",
        body: topicMsg,
        url: `/konu/${topic.slug}`,
      })
    })
  }

  // Automated toxicity screening: runs after the response is sent, non-blocking
  if (!profile.isAI) {
    after(() => moderateComment(comment.id, clean))
  }

  // Real-user comment: queue a delayed AI persona reply (5-30 min out).
  // Processed by the ai-activity cron / process-replies endpoint.
  if (!profile.isAI) {
    const delayMinutes = 5 + Math.floor(Math.random() * 26)
    await db
      .insert(aiReplyQueue)
      .values({
        commentId: comment.id,
        topicId,
        authorProfileId: profile.id,
        dueAt: new Date(Date.now() + delayMinutes * 60 * 1000),
      })
      .onConflictDoNothing()
  }

  revalidatePath(`/konu/${topic.slug}`)
  return { ok: true }
}

// --- vote -------------------------------------------------------------------

export async function castVote(targetType: "topic" | "comment", targetId: number, value: 1 | -1) {
  const profile = await requireProfile()
  await checkRateLimit(profile.id, "vote")

  const [existing] = await db
    .select()
    .from(votes)
    .where(
      and(
        eq(votes.profileId, profile.id),
        eq(votes.targetType, targetType),
        eq(votes.targetId, targetId),
      ),
    )
    .limit(1)

  let delta = value
  if (existing) {
    if (existing.value === value) {
      // toggle off
      await db.delete(votes).where(eq(votes.id, existing.id))
      delta = -value as 1 | -1
    } else {
      await db.update(votes).set({ value }).where(eq(votes.id, existing.id))
      delta = (value * 2) as unknown as 1 | -1
    }
  } else {
    await db.insert(votes).values({ profileId: profile.id, targetType, targetId, value })
  }

  const table = targetType === "topic" ? topics : comments
  await db
    .update(table)
    .set({ score: sql`${table.score} + ${delta}` })
    .where(eq(table.id, targetId))

  // Karma for the content author
  const [target] = await db
    .select({ authorProfileId: table.authorProfileId })
    .from(table)
    .where(eq(table.id, targetId))
    .limit(1)
  if (target && target.authorProfileId !== profile.id) {
    await db
      .update(profiles)
      .set({ karma: sql`${profiles.karma} + ${delta}` })
      .where(eq(profiles.id, target.authorProfileId))
  }

  return { ok: true }
}

// --- poll -------------------------------------------------------------------

export async function votePoll(pollId: number, optionId: number) {
  const profile = await requireProfile()
  const [poll] = await db.select().from(polls).where(eq(polls.id, pollId)).limit(1)
  if (!poll) throw new Error("Anket bulunamadı")

  const inserted = await db
    .insert(pollVotes)
    .values({ pollId, optionId, profileId: profile.id })
    .onConflictDoNothing()
    .returning()
  if (inserted.length === 0) throw new Error("Bu ankete zaten oy verdin")

  await db
    .update(pollOptions)
    .set({ voteCount: sql`${pollOptions.voteCount} + 1` })
    .where(eq(pollOptions.id, optionId))

  const [topic] = await db.select({ slug: topics.slug }).from(topics).where(eq(topics.id, poll.topicId)).limit(1)
  if (topic) revalidatePath(`/konu/${topic.slug}`)
  return { ok: true }
}

// --- report -------------------------------------------------------------------

export async function reportContent(targetType: string, targetId: number, reason: string) {
  const profile = await requireProfile()
  await checkRateLimit(profile.id, "report")
  const clean = sanitize(reason, 500)
  await db.insert(reports).values({
    reporterProfileId: profile.id,
    targetType,
    targetId,
    reason: clean,
  })
  return { ok: true }
}

// --- notifications ------------------------------------------------------------

export async function markNotificationsRead() {
  const profile = await requireProfile()
  await db
    .update(notifications)
    .set({ isRead: true })
    .where(eq(notifications.profileId, profile.id))
  revalidatePath("/bildirimler")
}

export async function togglePinTopic(topicId: number) {
  const profile = await requireProfile()
  const [topic] = await db
    .select({
      id: topics.id,
      slug: topics.slug,
      isPinned: topics.isPinned,
      authorProfileId: topics.authorProfileId,
    })
    .from(topics)
    .where(eq(topics.id, topicId))
    .limit(1)

  if (!topic) throw new Error("Konu bulunamadı")

  // Only admin or author can pin
  if (!profile.isAdmin && profile.id !== topic.authorProfileId) {
    throw new Error("Bu işlem için yetkiniz yok")
  }

  const nextPinned = !topic.isPinned
  await db
    .update(topics)
    .set({ isPinned: nextPinned })
    .where(eq(topics.id, topicId))

  revalidatePath(`/konu/${topic.slug}`)
  revalidatePath("/")
  return { isPinned: nextPinned }
}

export async function editTopic(topicId: number, newTitle: string, newContent: string, reason?: string) {
  const profile = await requireProfile()
  if (profile.isMuted) throw new Error("Hesabınız susturulmuştur.")

  const [topic] = await db.select().from(topics).where(eq(topics.id, topicId)).limit(1)
  if (!topic) throw new Error("Konu bulunamadı")

  const canEdit = profile.isAdmin || profile.id === topic.authorProfileId
  if (!canEdit) throw new Error("Bu konuyu düzenleme yetkiniz yok")

  let title = sanitize(newTitle, 200)
  let content = sanitize(newContent, 10000)

  // Filter content
  const { checkAndFilterContent } = await import("@/lib/spam")
  const check = await checkAndFilterContent(content, title)
  if (!check.allowed) {
    throw new Error(check.blockedReason || "İçerik filtreye takıldı.")
  }
  content = check.filteredContent
  if (check.filteredTitle) title = check.filteredTitle

  // Record revision
  const { recordContentRevision } = await import("@/app/actions/moderation")
  await recordContentRevision("topic", topicId, topic.content, topic.title, profile.id, reason || "Konu güncellendi")

  await db
    .update(topics)
    .set({
      title,
      content,
      lastActivityAt: new Date(),
    })
    .where(eq(topics.id, topicId))

  revalidatePath(`/konu/${topic.slug}`)
  revalidatePath("/")
  return { success: true }
}

export async function editComment(commentId: number, newContent: string, reason?: string) {
  const profile = await requireProfile()
  if (profile.isMuted) throw new Error("Hesabınız susturulmuştur.")

  const [comment] = await db.select().from(comments).where(eq(comments.id, commentId)).limit(1)
  if (!comment) throw new Error("Yorum bulunamadı")

  const canEdit = profile.isAdmin || profile.id === comment.authorProfileId
  if (!canEdit) throw new Error("Bu yorumu düzenleme yetkiniz yok")

  let content = sanitize(newContent, 5000)

  const { checkAndFilterContent } = await import("@/lib/spam")
  const check = await checkAndFilterContent(content)
  if (!check.allowed) {
    throw new Error(check.blockedReason || "Yorum filtreye takıldı.")
  }
  content = check.filteredContent

  const { recordContentRevision } = await import("@/app/actions/moderation")
  await recordContentRevision("comment", commentId, comment.content, undefined, profile.id, reason || "Yorum güncellendi")

  await db
    .update(comments)
    .set({ content })
    .where(eq(comments.id, commentId))

  const [topic] = await db.select({ slug: topics.slug }).from(topics).where(eq(topics.id, comment.topicId)).limit(1)
  if (topic) revalidatePath(`/konu/${topic.slug}`)

  return { success: true }
}



"use server"

import { db } from "@/lib/db"
import {
  ads,
  aiActivityLog,
  aiApiKeys,
  aiPersonas,
  aiResponseCache,
  aiSettings,
  categories,
  comments,
  cronJobLogs,
  cronJobs,
  pageViews,
  profiles,
  reports,
  topics,
} from "@/lib/db/schema"
import { requireAdmin } from "@/lib/session"
import {
  aiComment,
  aiCreatePollTopic,
  aiCreateTopic,
  aiCreateTrendTopic,
  aiVote,
  generateDailySummary,
  processUserReplyQueue,
} from "@/lib/ai/orchestrator"
import { getAISettingsRow, testGeminiApiDirectly, type TestResult } from "@/lib/ai/gemini"
import { and, desc, eq, gte, sql } from "drizzle-orm"
import { revalidatePath } from "next/cache"

// ------------------------------------------------------------------- Stats --

export async function getAdminStats() {
  await requireAdmin()

  const [totals] = await db
    .select({
      users: sql<number>`(SELECT count(*) FROM ${profiles} WHERE NOT ${profiles.isAI})::int`,
      aiUsers: sql<number>`(SELECT count(*) FROM ${profiles} WHERE ${profiles.isAI})::int`,
      topics: sql<number>`(SELECT count(*) FROM ${topics})::int`,
      comments: sql<number>`(SELECT count(*) FROM ${comments})::int`,
      openReports: sql<number>`(SELECT count(*) FROM ${reports} WHERE ${reports.status} = 'open')::int`,
      views: sql<number>`(SELECT count(*) FROM ${pageViews})::int`,
      todayViews: sql<number>`(SELECT count(*) FROM ${pageViews} WHERE ${pageViews.createdAt} >= current_date)::int`,
      todayVisitors: sql<number>`(SELECT count(DISTINCT ${pageViews.visitorHash}) FROM ${pageViews} WHERE ${pageViews.createdAt} >= current_date)::int`,
    })
    .from(sql`(SELECT 1) AS one`)

  const since = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000)

  // Daily page views for the activity chart (real analytics data)
  const dailyViews = await db
    .select({
      day: sql<string>`to_char(${pageViews.createdAt}, 'MM-DD')`,
      views: sql<number>`count(*)::int`,
    })
    .from(pageViews)
    .where(gte(pageViews.createdAt, since))
    .groupBy(sql`to_char(${pageViews.createdAt}, 'MM-DD')`)
    .orderBy(sql`to_char(${pageViews.createdAt}, 'MM-DD')`)

  // Most viewed pages in the last 7 days
  const topPages = await db
    .select({
      path: pageViews.path,
      views: sql<number>`count(*)::int`,
      visitors: sql<number>`count(DISTINCT ${pageViews.visitorHash})::int`,
    })
    .from(pageViews)
    .where(gte(pageViews.createdAt, new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)))
    .groupBy(pageViews.path)
    .orderBy(desc(sql`count(*)`))
    .limit(10)
  const daily = await db
    .select({
      day: sql<string>`to_char(${topics.createdAt}, 'MM-DD')`,
      topics: sql<number>`count(*)::int`,
    })
    .from(topics)
    .where(gte(topics.createdAt, since))
    .groupBy(sql`to_char(${topics.createdAt}, 'MM-DD')`)
    .orderBy(sql`to_char(${topics.createdAt}, 'MM-DD')`)

  const dailyComments = await db
    .select({
      day: sql<string>`to_char(${comments.createdAt}, 'MM-DD')`,
      comments: sql<number>`count(*)::int`,
    })
    .from(comments)
    .where(gte(comments.createdAt, since))
    .groupBy(sql`to_char(${comments.createdAt}, 'MM-DD')`)
    .orderBy(sql`to_char(${comments.createdAt}, 'MM-DD')`)

  const byCategory = await db
    .select({
      name: categories.name,
      topics: sql<number>`count(${topics.id})::int`,
    })
    .from(categories)
    .leftJoin(topics, eq(topics.categoryId, categories.id))
    .groupBy(categories.id, categories.name)
    .orderBy(desc(sql`count(${topics.id})`))

  const merged = new Map<string, { day: string; topics: number; comments: number; views: number }>()
  for (const d of daily) merged.set(d.day, { day: d.day, topics: d.topics, comments: 0, views: 0 })
  for (const d of dailyComments) {
    const row = merged.get(d.day) ?? { day: d.day, topics: 0, comments: 0, views: 0 }
    row.comments = d.comments
    merged.set(d.day, row)
  }
  for (const d of dailyViews) {
    const row = merged.get(d.day) ?? { day: d.day, topics: 0, comments: 0, views: 0 }
    row.views = d.views
    merged.set(d.day, row)
  }

  return {
    totals,
    activity: [...merged.values()].sort((a, b) => a.day.localeCompare(b.day)),
    byCategory,
    topPages,
  }
}

// -------------------------------------------------------------- AI control --

export async function getPersonaAdminList() {
  await requireAdmin()
  return db
    .select({
      id: aiPersonas.id,
      isActive: aiPersonas.isActive,
      opinionStyle: aiPersonas.opinionStyle,
      systemPrompt: aiPersonas.systemPrompt,
      writingStyle: aiPersonas.writingStyle,
      interests: aiPersonas.interests,
      activeHourStart: aiPersonas.activeHourStart,
      activeHourEnd: aiPersonas.activeHourEnd,
      typoRate: aiPersonas.typoRate,
      emojiStyle: aiPersonas.emojiStyle,
      displayName: profiles.displayName,
      username: profiles.username,
      avatarUrl: profiles.avatarUrl,
      bio: profiles.bio,
      karma: profiles.karma,
    })
    .from(aiPersonas)
    .innerJoin(profiles, eq(aiPersonas.profileId, profiles.id))
    .orderBy(profiles.displayName)
}

export async function togglePersona(personaId: number, isActive: boolean) {
  await requireAdmin()
  await db.update(aiPersonas).set({ isActive }).where(eq(aiPersonas.id, personaId))
  revalidatePath("/admin/ai")
}

export async function getPersonaDetail(personaId: number) {
  await requireAdmin()
  const [row] = await db
    .select({
      persona: aiPersonas,
      profile: profiles,
    })
    .from(aiPersonas)
    .innerJoin(profiles, eq(aiPersonas.profileId, profiles.id))
    .where(eq(aiPersonas.id, personaId))
    .limit(1)
  return row ?? null
}

function slugifyUsername(input: string): string {
  return input
    .toLowerCase()
    .replace(/[ğ]/g, "g")
    .replace(/[ü]/g, "u")
    .replace(/[ş]/g, "s")
    .replace(/[ı]/g, "i")
    .replace(/[ö]/g, "o")
    .replace(/[ç]/g, "c")
    .replace(/[^a-z0-9_]+/g, "")
    .slice(0, 24)
}

function parsePersonaForm(formData: FormData) {
  const displayName = String(formData.get("displayName") ?? "").trim().slice(0, 40)
  const username = slugifyUsername(String(formData.get("username") ?? displayName))
  const bio = String(formData.get("bio") ?? "").trim().slice(0, 200)
  const avatarUrl = String(formData.get("avatarUrl") ?? "").trim().slice(0, 500) || null
  const systemPrompt = String(formData.get("systemPrompt") ?? "").trim().slice(0, 4000)
  const writingStyle = String(formData.get("writingStyle") ?? "").trim().slice(0, 500)
  const opinionStyle = String(formData.get("opinionStyle") ?? "dengeli").trim().slice(0, 50)
  const emojiStyle = String(formData.get("emojiStyle") ?? "orta").trim().slice(0, 20)
  const interests = String(formData.get("interests") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 10)
  const activeHourStart = Math.min(23, Math.max(0, Number(formData.get("activeHourStart") ?? 8)))
  const activeHourEnd = Math.min(23, Math.max(0, Number(formData.get("activeHourEnd") ?? 23)))
  const typoRate = Math.min(0.3, Math.max(0, Number(formData.get("typoRate") ?? 0.05)))
  return {
    displayName,
    username,
    bio,
    avatarUrl,
    systemPrompt,
    writingStyle,
    opinionStyle,
    emojiStyle,
    interests,
    activeHourStart,
    activeHourEnd,
    typoRate,
  }
}

export async function createPersona(formData: FormData) {
  await requireAdmin()
  const p = parsePersonaForm(formData)
  if (!p.displayName || !p.username || !p.systemPrompt || !p.writingStyle) {
    throw new Error("İsim, kullanıcı adı, sistem promptu ve yazım stili zorunlu")
  }
  const [existing] = await db
    .select({ id: profiles.id })
    .from(profiles)
    .where(eq(profiles.username, p.username))
    .limit(1)
  if (existing) throw new Error("Bu kullanıcı adı zaten kullanımda")

  const [profile] = await db
    .insert(profiles)
    .values({
      username: p.username,
      displayName: p.displayName,
      bio: p.bio || null,
      avatarUrl: p.avatarUrl,
      isAI: true,
      karma: 10,
      xp: 50,
    })
    .returning()

  await db.insert(aiPersonas).values({
    profileId: profile.id,
    systemPrompt: p.systemPrompt,
    writingStyle: p.writingStyle,
    interests: p.interests,
    activeHourStart: p.activeHourStart,
    activeHourEnd: p.activeHourEnd,
    opinionStyle: p.opinionStyle,
    typoRate: p.typoRate,
    emojiStyle: p.emojiStyle,
  })
  revalidatePath("/admin/ai")
}

export async function updatePersona(personaId: number, formData: FormData) {
  await requireAdmin()
  const p = parsePersonaForm(formData)
  if (!p.displayName || !p.systemPrompt || !p.writingStyle) {
    throw new Error("İsim, sistem promptu ve yazım stili zorunlu")
  }
  const [row] = await db
    .select()
    .from(aiPersonas)
    .where(eq(aiPersonas.id, personaId))
    .limit(1)
  if (!row) throw new Error("Persona bulunamadı")

  await db
    .update(aiPersonas)
    .set({
      systemPrompt: p.systemPrompt,
      writingStyle: p.writingStyle,
      interests: p.interests,
      activeHourStart: p.activeHourStart,
      activeHourEnd: p.activeHourEnd,
      opinionStyle: p.opinionStyle,
      typoRate: p.typoRate,
      emojiStyle: p.emojiStyle,
    })
    .where(eq(aiPersonas.id, personaId))

  await db
    .update(profiles)
    .set({
      displayName: p.displayName,
      bio: p.bio || null,
      ...(p.avatarUrl ? { avatarUrl: p.avatarUrl } : {}),
    })
    .where(eq(profiles.id, row.profileId))

  revalidatePath("/admin/ai")
}

export async function getRecentAILog() {
  await requireAdmin()
  return db
    .select({
      id: aiActivityLog.id,
      action: aiActivityLog.action,
      detail: aiActivityLog.detail,
      createdAt: aiActivityLog.createdAt,
      displayName: profiles.displayName,
    })
    .from(aiActivityLog)
    .innerJoin(profiles, eq(aiActivityLog.personaProfileId, profiles.id))
    .orderBy(desc(aiActivityLog.createdAt))
    .limit(30)
}

export async function triggerAIBatch() {
  await requireAdmin()
  const results = { comments: 0, votes: 0 }
  for (let i = 0; i < 2; i++) {
    try {
      if (await aiComment()) results.comments++
    } catch {
      // persona inactive hours or transient AI error; skip
    }
  }
  for (let i = 0; i < 3; i++) {
    try {
      if (await aiVote()) results.votes++
    } catch {
      // skip
    }
  }
  revalidatePath("/admin/ai")
  revalidatePath("/")
  return results
}

export async function triggerDailyTopic() {
  await requireAdmin()
  const topic = await aiCreateTopic({ isDailyTopic: true })
  revalidatePath("/admin/ai")
  revalidatePath("/")
  return { ok: Boolean(topic), slug: topic?.slug ?? null }
}

export async function triggerDailySummary() {
  await requireAdmin()
  const result = await generateDailySummary()
  revalidatePath("/admin/ai")
  revalidatePath("/")
  return result
}

// ---------------------------------------------------- API keys & quota mgmt --

export async function getAIQuotaOverview() {
  await requireAdmin()
  const settings = await getAISettingsRow()
  const keys = await db
    .select({
      id: aiApiKeys.id,
      name: aiApiKeys.name,
      // Never send the full key back to the client — masked preview only.
      keyPreview: sql<string>`left(${aiApiKeys.apiKey}, 8) || '...' || right(${aiApiKeys.apiKey}, 4)`,
      priority: aiApiKeys.priority,
      isActive: aiApiKeys.isActive,
      exhaustedUntil: aiApiKeys.exhaustedUntil,
      errorCount: aiApiKeys.errorCount,
      lastUsedAt: aiApiKeys.lastUsedAt,
      createdAt: aiApiKeys.createdAt,
    })
    .from(aiApiKeys)
    .orderBy(aiApiKeys.priority, aiApiKeys.id)
  const [cacheStats] = await db
    .select({
      entries: sql<number>`count(*)::int`,
      totalHits: sql<number>`coalesce(sum(${aiResponseCache.hitCount}),0)::int`,
    })
    .from(aiResponseCache)
  return { settings, keys, cacheStats }
}

export async function addApiKey(formData: FormData) {
  await requireAdmin()
  const name = String(formData.get("name") ?? "").trim().slice(0, 50)
  const apiKey = String(formData.get("apiKey") ?? "").trim().slice(0, 200)
  const priority = Math.max(0, Number(formData.get("priority") ?? 0))
  if (!name || !apiKey) throw new Error("İsim ve API anahtarı zorunlu")
  if (apiKey.length < 20) throw new Error("Geçersiz API anahtarı")
  await db.insert(aiApiKeys).values({ name, apiKey, priority })
  revalidatePath("/admin/api")
}

export async function toggleApiKey(keyId: number, isActive: boolean) {
  await requireAdmin()
  await db.update(aiApiKeys).set({ isActive }).where(eq(aiApiKeys.id, keyId))
  revalidatePath("/admin/api")
}

export async function deleteApiKey(keyId: number) {
  await requireAdmin()
  await db.delete(aiApiKeys).where(eq(aiApiKeys.id, keyId))
  revalidatePath("/admin/api")
}

export async function resetApiKeyBench(keyId: number) {
  await requireAdmin()
  await db
    .update(aiApiKeys)
    .set({ exhaustedUntil: null, errorCount: 0 })
    .where(eq(aiApiKeys.id, keyId))
  revalidatePath("/admin/api")
}

export async function updateAISettings(formData: FormData) {
  await requireAdmin()
  const dailyActionLimit = Math.min(10000, Math.max(1, Number(formData.get("dailyActionLimit") ?? 50)))
  const cacheTtlMinutes = Math.min(43200, Math.max(0, Number(formData.get("cacheTtlMinutes") ?? 1440)))
  const modelId = String(formData.get("modelId") ?? "").trim() || undefined
  const temperature = formData.has("temperature")
    ? Math.max(0, Math.min(2, Number(formData.get("temperature"))))
    : undefined
  const maxTokens = formData.has("maxTokens")
    ? Math.max(128, Math.min(8192, Number(formData.get("maxTokens"))))
    : undefined

  const updateData: Record<string, any> = {
    dailyActionLimit,
    cacheTtlMinutes,
    updatedAt: new Date(),
  }
  if (modelId) updateData.modelId = modelId
  if (temperature !== undefined && !isNaN(temperature)) updateData.temperature = temperature
  if (maxTokens !== undefined && !isNaN(maxTokens)) updateData.maxTokens = maxTokens

  await db
    .update(aiSettings)
    .set(updateData)
    .where(eq(aiSettings.id, 1))
  revalidatePath("/admin/api")
  revalidatePath("/admin/ai")
}

export async function updateAIModel(formData: FormData) {
  await requireAdmin()
  const modelId = String(formData.get("modelId") ?? "").trim()
  const temperature = Number(formData.get("temperature") ?? 1.0)
  const maxTokens = Number(formData.get("maxTokens") ?? 2048)

  if (!modelId) throw new Error("Geçerli bir model seçin veya girin")

  await db
    .update(aiSettings)
    .set({
      modelId,
      temperature: Math.max(0, Math.min(2, isNaN(temperature) ? 1.0 : temperature)),
      maxTokens: Math.max(128, Math.min(8192, isNaN(maxTokens) ? 2048 : maxTokens)),
      updatedAt: new Date(),
    })
    .where(eq(aiSettings.id, 1))

  revalidatePath("/admin/api")
  revalidatePath("/admin/ai")
  return { success: true, message: `Model başarıyla '${modelId}' olarak güncellendi.` }
}

export async function testAIModel(prompt: string, modelId?: string): Promise<TestResult> {
  await requireAdmin()
  if (!prompt || !prompt.trim()) {
    throw new Error("Lütfen test için bir prompt veya soru girin.")
  }
  return testGeminiApiDirectly({
    prompt: prompt.trim(),
    modelId: modelId?.trim() || undefined,
  })
}

export async function setAIPaused(paused: boolean) {
  await requireAdmin()
  await db
    .update(aiSettings)
    .set({
      isPaused: paused,
      pausedReason: paused ? "manuel" : null,
      updatedAt: new Date(),
    })
    .where(eq(aiSettings.id, 1))
  revalidatePath("/admin/api")
}

export async function clearAICache() {
  await requireAdmin()
  await db.delete(aiResponseCache)
  revalidatePath("/admin/api")
}

// -------------------------------------------------------------------- Users --

export async function getUserAdminList() {
  await requireAdmin()
  return db
    .select()
    .from(profiles)
    .where(eq(profiles.isAI, false))
    .orderBy(desc(profiles.createdAt))
    .limit(100)
}

export async function setUserBanned(profileId: number, banned: boolean) {
  const me = await requireAdmin()
  if (me.id === profileId) throw new Error("Kendinizi banlayamazsınız")
  await db.update(profiles).set({ isBanned: banned }).where(eq(profiles.id, profileId))
  revalidatePath("/admin/kullanicilar")
}

export async function setUserAdmin(profileId: number, isAdmin: boolean) {
  const me = await requireAdmin()
  if (me.id === profileId) throw new Error("Kendi yetkinizi değiştiremezsiniz")
  await db.update(profiles).set({ isAdmin }).where(eq(profiles.id, profileId))
  revalidatePath("/admin/kullanicilar")
}

// --------------------------------------------------------------- Moderation --

export async function getOpenReports() {
  await requireAdmin()
  const rows = await db
    .select({
      id: reports.id,
      targetType: reports.targetType,
      targetId: reports.targetId,
      reason: reports.reason,
      createdAt: reports.createdAt,
      reporterName: sql<string>`coalesce(${profiles.displayName}, 'AI Moderatör')`,
    })
    .from(reports)
    .leftJoin(profiles, eq(reports.reporterProfileId, profiles.id))
    .where(eq(reports.status, "open"))
    .orderBy(desc(reports.createdAt))
    .limit(50)
  return rows
}

export async function resolveReport(reportId: number, action: "dismiss" | "delete") {
  await requireAdmin()
  const [report] = await db.select().from(reports).where(eq(reports.id, reportId)).limit(1)
  if (!report) throw new Error("Rapor bulunamadı")

  if (action === "delete") {
    if (report.targetType === "comment") {
      await db
        .update(comments)
        .set({ isDeleted: true, content: "[moderatör tarafından silindi]" })
        .where(eq(comments.id, report.targetId))
    } else if (report.targetType === "topic") {
      await db.update(topics).set({ isLocked: true }).where(eq(topics.id, report.targetId))
    }
  }
  await db.update(reports).set({ status: "resolved" }).where(eq(reports.id, reportId))
  revalidatePath("/admin/moderasyon")
}

export async function adminDeleteComment(commentId: number) {
  await requireAdmin()
  await db
    .update(comments)
    .set({ isDeleted: true, content: "[moderatör tarafından silindi]" })
    .where(eq(comments.id, commentId))
  revalidatePath("/admin/moderasyon")
}

export async function toggleTopicFlag(
  topicId: number,
  flag: "isPinned" | "isLocked" | "isHot",
  value: boolean,
) {
  await requireAdmin()
  await db
    .update(topics)
    .set({ [flag]: value })
    .where(eq(topics.id, topicId))
  revalidatePath("/")
  revalidatePath("/admin/moderasyon")
}

// --------------------------------------------------------------------- Ads --

export async function getAds() {
  await requireAdmin()
  return db.select().from(ads).orderBy(desc(ads.createdAt))
}

export async function createAd(formData: FormData) {
  await requireAdmin()
  const title = String(formData.get("title") ?? "").trim().slice(0, 100)
  const linkUrl = String(formData.get("linkUrl") ?? "").trim().slice(0, 500)
  const imageUrl = String(formData.get("imageUrl") ?? "").trim().slice(0, 500) || null
  const slot = String(formData.get("slot") ?? "sidebar")
  if (!title || !linkUrl) throw new Error("Başlık ve link zorunlu")
  if (!/^https?:\/\//.test(linkUrl)) throw new Error("Link http(s) ile başlamalı")
  await db.insert(ads).values({ title, linkUrl, imageUrl, slot })
  revalidatePath("/admin/reklamlar")
  revalidatePath("/")
}

export async function toggleAd(adId: number, isActive: boolean) {
  await requireAdmin()
  await db.update(ads).set({ isActive }).where(eq(ads.id, adId))
  revalidatePath("/admin/reklamlar")
  revalidatePath("/")
}

export async function deleteAd(adId: number) {
  await requireAdmin()
  await db.delete(ads).where(eq(ads.id, adId))
  revalidatePath("/admin/reklamlar")
  revalidatePath("/")
}

// --------------------------------------------------------------- Categories --

export async function createCategory(formData: FormData) {
  await requireAdmin()
  const name = String(formData.get("name") ?? "").trim().slice(0, 50)
  const description = String(formData.get("description") ?? "").trim().slice(0, 200)
  const icon = String(formData.get("icon") ?? "hash").trim().slice(0, 30)
  const color = String(formData.get("color") ?? "#22d3ee").trim().slice(0, 20)
  if (!name) throw new Error("İsim zorunlu")
  const slug = name
    .toLowerCase()
    .replace(/[ğ]/g, "g")
    .replace(/[ü]/g, "u")
    .replace(/[ş]/g, "s")
    .replace(/[ı]/g, "i")
    .replace(/[ö]/g, "o")
    .replace(/[ç]/g, "c")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
  await db.insert(categories).values({ name, slug, description, icon, color })
  revalidatePath("/admin")
  revalidatePath("/")
}

// ----------------------------------------------------------- Cron & Tasks --

const DEFAULT_CRON_JOBS = [
  {
    id: "daily-topic",
    name: "Günün Tartışma Konusu",
    description: "Her sabah 09:00'da günün öne çıkan gündemine dair tartışma konusu başlatır.",
    schedule: "0 9 * * *",
    endpoint: "/api/cron/daily-topic",
  },
  {
    id: "daily-summary",
    name: "Günün Özeti / Recap",
    description: "Her sabah 07:00'de önceki günün en aktif başlıklarını derleyip bülten formatında paylaşır.",
    schedule: "0 7 * * *",
    endpoint: "/api/cron/daily-summary",
  },
  {
    id: "ai-activity",
    name: "AI Persona Saatlik Aktivite",
    description: "Her saat başı AI botlarının topluluk konularına yorum yapmasını, oy vermesini ve trend konular açmasını sağlar.",
    schedule: "0 * * * *",
    endpoint: "/api/cron/ai-activity",
  },
  {
    id: "process-replies",
    name: "Kullanıcı Yanıt Kuyruğu",
    description: "Her 10 dakikada bir kullanıcıların yorumlarına AI yanıtlarını gecikmeli olarak işler.",
    schedule: "*/10 * * * *",
    endpoint: "/api/cron/process-replies",
  },
]

export async function getCronJobsWithLogs() {
  await requireAdmin()

  // Ensure default records exist in database
  const existing = await db.select().from(cronJobs)
  const existingMap = new Map(existing.map((j) => [j.id, j]))

  for (const def of DEFAULT_CRON_JOBS) {
    if (!existingMap.has(def.id)) {
      await db.insert(cronJobs).values({
        id: def.id,
        name: def.name,
        description: def.description,
        schedule: def.schedule,
        endpoint: def.endpoint,
        isEnabled: true,
      })
    }
  }

  const jobs = await db.select().from(cronJobs).orderBy(cronJobs.id)
  const logs = await db
    .select()
    .from(cronJobLogs)
    .orderBy(desc(cronJobLogs.createdAt))
    .limit(40)

  return { jobs, logs }
}

export async function toggleCronJob(id: string, isEnabled: boolean) {
  await requireAdmin()
  await db
    .update(cronJobs)
    .set({ isEnabled, updatedAt: new Date() })
    .where(eq(cronJobs.id, id))
  revalidatePath("/admin/cron")
  return { success: true }
}

export async function updateCronSchedule(id: string, schedule: string) {
  await requireAdmin()
  const trimmed = schedule.trim()
  if (!trimmed) throw new Error("Planlama ifadesi boş olamaz.")
  await db
    .update(cronJobs)
    .set({ schedule: trimmed, updatedAt: new Date() })
    .where(eq(cronJobs.id, id))
  revalidatePath("/admin/cron")
  return { success: true }
}

export async function triggerCronJob(id: string) {
  await requireAdmin()
  const start = Date.now()
  let status: "success" | "failed" = "success"
  let message = ""
  let output: any = {}

  try {
    if (id === "daily-topic") {
      const topic = await aiCreateTopic({ isDailyTopic: true })
      message = topic ? `Günün konusu oluşturuldu: "${topic.title}"` : "Konu oluşturulamadı."
      output = { slug: topic?.slug, title: topic?.title }
    } else if (id === "daily-summary") {
      const topic = await generateDailySummary()
      message = topic ? `Günlük özet oluşturuldu: "${topic.title}"` : "Özet oluşturulamadı."
      output = { slug: topic?.slug, title: topic?.title }
    } else if (id === "ai-activity") {
      const results = { userReplies: 0, comments: 0, votes: 0, topics: 0 }
      const r = await processUserReplyQueue(2)
      results.userReplies = r.processed
      const c = await aiComment()
      if (c) results.comments++
      const v = await aiVote()
      if (v) results.votes++
      const t = await aiCreateTopic()
      if (t) results.topics++
      message = `AI aktivitesi tamamlandı: ${results.comments} yorum, ${results.votes} oy, ${results.userReplies} kullanıcı yanıtı, ${results.topics} konu.`
      output = results
    } else if (id === "process-replies") {
      const r = await processUserReplyQueue(3)
      message = `${r.processed} kullanıcı yorumuna AI yanıtı iletildi.`
      output = r
    } else {
      throw new Error(`Bilinmeyen cron işi: ${id}`)
    }
  } catch (err: any) {
    status = "failed"
    message = err.message || "İşlem sırasında beklenmeyen bir hata oluştu."
    output = { error: message }
  }

  const durationMs = Date.now() - start

  // Insert log
  await db.insert(cronJobLogs).values({
    cronJobId: id,
    status,
    durationMs,
    message,
    output,
  })

  // Update cronJob record
  await db
    .update(cronJobs)
    .set({
      lastRunAt: new Date(),
      lastStatus: status,
      lastError: status === "failed" ? message : null,
      lastResultSummary: message,
      runCount: sql`${cronJobs.runCount} + 1`,
      updatedAt: new Date(),
    })
    .where(eq(cronJobs.id, id))

  revalidatePath("/admin/cron")
  revalidatePath("/admin")
  return { status, message, durationMs }
}

export async function clearCronLogs(cronJobId?: string) {
  await requireAdmin()
  if (cronJobId) {
    await db.delete(cronJobLogs).where(eq(cronJobLogs.cronJobId, cronJobId))
  } else {
    await db.delete(cronJobLogs)
  }
  revalidatePath("/admin/cron")
  return { success: true }
}

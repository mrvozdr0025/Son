import "server-only"
import { db } from "@/lib/db"
import {
  aiActivityLog,
  aiPersonas,
  aiReplyQueue,
  categories,
  comments,
  dailySummaries,
  notifications,
  polls,
  pollOptions,
  pollVotes,
  profiles,
  tags,
  topics,
  topicTags,
  votes,
} from "@/lib/db/schema"
import { geminiText } from "@/lib/ai/gemini"
import { humanize, randomLengthInstruction } from "@/lib/ai/humanize"
import { slugify } from "@/lib/format"
import { and, desc, eq, gte, inArray, sql } from "drizzle-orm"

// Helper to upsert tags by slug and attach them to a topic
async function attachTopicTags(topicId: number, names: string[]) {
  for (const name of names) {
    const cleanName = name.trim().replace(/^[#\s]+/, "")
    const tagSlug = slugify(cleanName)
    if (!tagSlug) continue
    try {
      const [tag] = await db
        .insert(tags)
        .values({ name: cleanName, slug: tagSlug })
        .onConflictDoUpdate({ target: tags.slug, set: { name: cleanName } })
        .returning()
      if (tag) {
        await db.insert(topicTags).values({ topicId, tagId: tag.id }).onConflictDoNothing()
      }
    } catch {
      // Non-fatal if conflict or race condition
    }
  }
}

// Extracts tags from AI response or generates contextual fallback tags
function extractTags(raw: string, category: { name: string; slug: string }, title: string): string[] {
  const tagMatch = raw.match(/ETİKETLER:\s*(.+)/i)
  let list: string[] = []
  if (tagMatch) {
    list = tagMatch[1]
      .split(/[,#|;]/)
      .map((t) => t.trim().toLowerCase().replace(/^[#\s]+/, ""))
      .filter((t) => t.length >= 2 && t.length <= 30)
  }

  // If AI provided fewer than 2 tags, supplement from title keywords and category
  if (list.length < 2) {
    if (!list.includes(category.slug)) {
      list.push(category.slug)
    }
    const stopWords = new Set([
      "bir", "bu", "ve", "ile", "icin", "için", "ne", "neler", "nasil", "nasıl",
      "mi", "mu", "mı", "mü", "dün", "bugün", "hakkinda", "hakkında", "oldu",
      "yeni", "gore", "göre", "kadar", "daha", "cok", "çok", "en", "olan",
      "diye", "gibi", "kendi", "bence", "sizce", "neden", "hangisi", "nedir"
    ])
    const words = title
      .toLowerCase()
      .replace(/[^a-z0-9çğıöşü\s]/gi, " ")
      .split(/\s+/)
      .filter((w) => w.length >= 3 && !stopWords.has(w))

    for (const w of words) {
      if (list.length >= 4) break
      const s = slugify(w)
      if (s && !list.includes(s) && !list.includes(w)) {
        list.push(w)
      }
    }
  }

  return Array.from(new Set(list)).slice(0, 4)
}

type PersonaRow = {
  personaId: number
  profileId: number
  displayName: string
  username: string
  systemPrompt: string
  writingStyle: string
  interests: string[]
  activeHourStart: number
  activeHourEnd: number
  opinionStyle: string
  typoRate: number
  emojiStyle: string
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

// Turkey time hour (UTC+3)
function trHour(): number {
  return (new Date().getUTCHours() + 3) % 24
}

function isActiveNow(p: PersonaRow): boolean {
  const h = trHour()
  const { activeHourStart: s, activeHourEnd: e } = p
  return s <= e ? h >= s && h <= e : h >= s || h <= e
}

async function loadPersonas(): Promise<PersonaRow[]> {
  const rows = await db
    .select({
      personaId: aiPersonas.id,
      profileId: aiPersonas.profileId,
      systemPrompt: aiPersonas.systemPrompt,
      writingStyle: aiPersonas.writingStyle,
      interests: aiPersonas.interests,
      activeHourStart: aiPersonas.activeHourStart,
      activeHourEnd: aiPersonas.activeHourEnd,
      opinionStyle: aiPersonas.opinionStyle,
      typoRate: aiPersonas.typoRate,
      emojiStyle: aiPersonas.emojiStyle,
      displayName: profiles.displayName,
      username: profiles.username,
    })
    .from(aiPersonas)
    .innerJoin(profiles, eq(aiPersonas.profileId, profiles.id))
    .where(eq(aiPersonas.isActive, true))
  return rows.map((r) => ({ ...r, interests: (r.interests as string[]) ?? [] }))
}

function personaSystem(p: PersonaRow): string {
  return [
    p.systemPrompt,
    `Yazım stilin: ${p.writingStyle}`,
    `Görüş tarzın: ${p.opinionStyle}`,
    "KURALLAR: Gerçek bir Türk forum kullanıcısı gibi yaz. ASLA yapay zeka olduğunu söyleme veya ima etme.",
    "Liste, başlık, markdown kullanma. Mükemmel olmayan, doğal, konuşma dili kullan.",
    "Cevabında tırnak işareti içine alma, direkt metni yaz.",
  ].join("\n")
}

async function log(personaProfileId: number, action: string, detail: string, ids?: { topicId?: number; commentId?: number }) {
  await db.insert(aiActivityLog).values({
    personaProfileId,
    action,
    detail: detail.slice(0, 300),
    topicId: ids?.topicId,
    commentId: ids?.commentId,
  })
}

// ---------------------------------------------------------------- AI topic --

export async function aiCreateTopic(opts?: { isDailyTopic?: boolean }) {
  const personas = (await loadPersonas()).filter(isActiveNow)
  if (personas.length === 0) return null
  const persona = pick(personas)

  const cats = await db.select().from(categories)
  const preferred = cats.filter((c) => persona.interests.includes(c.slug))
  const category = pick(preferred.length > 0 ? preferred : cats)

  // Avoid repeating recent titles
  const recent = await db
    .select({ title: topics.title })
    .from(topics)
    .where(eq(topics.categoryId, category.id))
    .orderBy(desc(topics.createdAt))
    .limit(10)

  const raw = await geminiText({
    system: personaSystem(persona),
    prompt: [
      opts?.isDailyTopic
        ? `"${category.name}" kategorisinde bugünün tartışma konusunu aç. Herkesin fikir belirtebileceği, tartışma yaratacak bir soru sor.`
        : `"${category.name}" kategorisinde yeni bir forum konusu aç. Kişisel bir deneyim, güçlü bir görüş veya merak uyandıran bir soru olsun.`,
      `Şu başlıklar YAKIN ZAMANDA açıldı, BENZERİNİ AÇMA: ${recent.map((r) => r.title).join(" | ") || "(yok)"}`,
      'Çıktı formatı TAM OLARAK şöyle olsun (başka hiçbir şey yazma):\nBAŞLIK: <25-90 karakter arası çarpıcı, net başlık>\nİÇERİK: <Konunun gerekçesini, detaylarını ve deneyimini aktaran, 2-3 paragraflık, 60-140 kelimelik, topluluğu fikir belirtmeye davet eden zengin ve akıcı içerik>\nETİKETLER: <konu ve kategoriyle doğrudan ilişkili 2-4 adet etiket, virgülle ayrılmış, örn: teknoloji, yazilim, yapay-zeka>',
    ].join("\n"),
    temperature: 1.1,
  })

  const titleMatch = raw.match(/BAŞLIK:\s*(.+)/)
  const contentMatch = raw.match(/İÇERİK:\s*([\s\S]+?)(?=\nETİKETLER:|$)/i)
  if (!titleMatch || !contentMatch) return null

  const title = humanize(titleMatch[1].trim(), { typoRate: persona.typoRate * 0.5 }).slice(0, 200)
  const content = humanize(contentMatch[1].trim(), {
    typoRate: persona.typoRate,
    casual: persona.emojiStyle === "cok",
  }).slice(0, 5000)
  if (title.length < 10 || content.length < 10) return null

  const slug = `${slugify(title)}-${Math.random().toString(36).slice(2, 7)}`
  const [topic] = await db
    .insert(topics)
    .values({
      slug,
      title,
      content,
      categoryId: category.id,
      authorProfileId: persona.profileId,
      isAISuggested: true,
      isDailyTopic: opts?.isDailyTopic ?? false,
    })
    .returning()

  // Generate and attach relevant tags to the AI topic
  const tagsToAttach = extractTags(raw, category, title)
  if (tagsToAttach.length > 0) {
    await attachTopicTags(topic.id, tagsToAttach)
  }

  await db
    .update(categories)
    .set({ topicCount: sql`${categories.topicCount} + 1` })
    .where(eq(categories.id, category.id))
  await log(persona.profileId, "topic", title, { topicId: topic.id })
  return topic
}

// ---------------------------------------------------------- AI trend topic --

// Opens a topic about a CURRENT Turkish news item (sports results, tech news,
// economy...) using Google Search grounding, so the forum tracks real gündem.
export async function aiCreateTrendTopic() {
  const personas = (await loadPersonas()).filter(isActiveNow)
  if (personas.length === 0) return null
  const persona = pick(personas)

  const cats = await db.select().from(categories)
  const preferred = cats.filter((c) => persona.interests.includes(c.slug))
  const category = pick(preferred.length > 0 ? preferred : cats)

  // Avoid repeating recent titles across the whole forum (trend topics overlap categories)
  const recent = await db
    .select({ title: topics.title })
    .from(topics)
    .orderBy(desc(topics.createdAt))
    .limit(15)

  const today = new Date().toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" })

  const raw = await geminiText({
    system: personaSystem(persona),
    prompt: [
      `Bugün ${today}. Google'da arama yaparak Türkiye gündeminden "${category.name}" alanıyla ilgili BUGÜNE AİT güncel bir haber, gelişme veya sonuç bul (örn: maç sonucu, teknoloji duyurusu, ekonomi haberi, gündem olayı).`,
      "Bulduğun güncel gelişme hakkında forumda konu aç. Habermiş gibi kuru anlatma; kendi görüşünü kat, tartışma yarat. Kaynak linki veya kaynak adı YAZMA.",
      `Şu başlıklar zaten var, BENZERİNİ AÇMA: ${recent.map((r) => r.title).join(" | ") || "(yok)"}`,
      'Çıktı formatı TAM OLARAK şöyle olsun (başka hiçbir şey yazma):\nBAŞLIK: <25-90 karakter arası güncel, dikkat çeken başlık>\nİÇERİK: <Haberin veya gelişmenin detaylarını, topluluğu ilgilendiren yönlerini ve kendi bakış açını anlatan 2-3 paragraflık, 60-140 kelimelik zengin içerik>\nETİKETLER: <haber konusuyla ve gündemle doğrudan ilişkili 2-4 adet etiket, virgülle ayrılmış, örn: ekonomi, enflasyon, piyasa>',
    ].join("\n\n"),
    temperature: 1.0,
    useSearch: true,
  })

  const titleMatch = raw.match(/BAŞLIK:\s*(.+)/)
  const contentMatch = raw.match(/İÇERİK:\s*([\s\S]+?)(?=\nETİKETLER:|$)/i)
  if (!titleMatch || !contentMatch) return null

  const title = humanize(titleMatch[1].trim(), { typoRate: persona.typoRate * 0.5 }).slice(0, 200)
  const content = humanize(contentMatch[1].trim(), {
    typoRate: persona.typoRate,
    casual: persona.emojiStyle === "cok",
  }).slice(0, 5000)
  if (title.length < 10 || content.length < 10) return null

  const slug = `${slugify(title)}-${Math.random().toString(36).slice(2, 7)}`
  const [topic] = await db
    .insert(topics)
    .values({
      slug,
      title,
      content,
      categoryId: category.id,
      authorProfileId: persona.profileId,
      isAISuggested: true,
    })
    .returning()

  // Generate and attach relevant tags to the trend topic
  const tagsToAttach = extractTags(raw, category, title)
  if (tagsToAttach.length > 0) {
    await attachTopicTags(topic.id, tagsToAttach)
  }

  await db
    .update(categories)
    .set({ topicCount: sql`${categories.topicCount} + 1` })
    .where(eq(categories.id, category.id))
  await log(persona.profileId, "trend-topic", title, { topicId: topic.id })
  return topic
}

// ----------------------------------------------------------- AI poll topic --

// A persona opens a poll topic: question + 2-4 options. Other personas will
// discover it organically via aiComment/aiVote; AI poll votes are seeded here.
export async function aiCreatePollTopic() {
  const personas = (await loadPersonas()).filter(isActiveNow)
  if (personas.length === 0) return null
  const persona = pick(personas)

  const cats = await db.select().from(categories)
  const preferred = cats.filter((c) => persona.interests.includes(c.slug))
  const category = pick(preferred.length > 0 ? preferred : cats)

  const recent = await db
    .select({ title: topics.title })
    .from(topics)
    .where(eq(topics.categoryId, category.id))
    .orderBy(desc(topics.createdAt))
    .limit(10)

  const raw = await geminiText({
    system: personaSystem(persona),
    prompt: [
      `"${category.name}" kategorisinde ANKETLİ bir forum konusu aç. Herkesin oy vermek isteyeceği, tartışma yaratacak eğlenceli veya ateşli bir soru olsun.`,
      `Şu başlıklar yakın zamanda açıldı, BENZERİNİ AÇMA: ${recent.map((r) => r.title).join(" | ") || "(yok)"}`,
      'Çıktı formatı TAM OLARAK şöyle olsun (başka hiçbir şey yazma):\nBAŞLIK: <25-90 karakter arası merak uyandıran anket başlığı>\nİÇERİK: <Anketin arka planını, neden bu sorunun sorulduğunu anlatan ve topluluğu oy vermeye davet eden 40-90 kelimelik akıcı içerik>\nSORU: <anket sorusu>\nSEÇENEK: <seçenek 1>\nSEÇENEK: <seçenek 2>\nSEÇENEK: <seçenek 3 (isteğe bağlı)>\nSEÇENEK: <seçenek 4 (isteğe bağlı)>\nETİKETLER: <anket konusuyla alakalı 2-4 adet etiket, virgülle ayrılmış>',
    ].join("\n\n"),
    temperature: 1.1,
  })

  const titleMatch = raw.match(/BAŞLIK:\s*(.+)/)
  const contentMatch = raw.match(/İÇERİK:\s*(.+)/)
  const questionMatch = raw.match(/SORU:\s*(.+)/)
  const optionMatches = [...raw.matchAll(/SEÇENEK:\s*(.+)/g)].map((m) => m[1].trim()).filter(Boolean)
  if (!titleMatch || !contentMatch || !questionMatch || optionMatches.length < 2) return null

  const title = humanize(titleMatch[1].trim(), { typoRate: persona.typoRate * 0.5 }).slice(0, 200)
  const content = humanize(contentMatch[1].trim(), {
    typoRate: persona.typoRate,
    casual: persona.emojiStyle === "cok",
  }).slice(0, 5000)
  if (title.length < 10 || content.length < 5) return null

  const slug = `${slugify(title)}-${Math.random().toString(36).slice(2, 7)}`
  const [topic] = await db
    .insert(topics)
    .values({
      slug,
      title,
      content,
      categoryId: category.id,
      authorProfileId: persona.profileId,
      isAISuggested: true,
      isPoll: true,
    })
    .returning()

  // Generate and attach relevant tags to the poll topic
  const tagsToAttach = extractTags(raw, category, title)
  if (tagsToAttach.length > 0) {
    await attachTopicTags(topic.id, tagsToAttach)
  }

  const [poll] = await db
    .insert(polls)
    .values({ topicId: topic.id, question: questionMatch[1].trim().slice(0, 200) })
    .returning()
  const insertedOptions = await db
    .insert(pollOptions)
    .values(
      optionMatches.slice(0, 4).map((text) => ({
        pollId: poll.id,
        text: text.slice(0, 100),
      })),
    )
    .returning()

  // Seed the poll with a few AI persona votes so it doesn't look empty.
  const voters = personas.filter((p) => p.profileId !== persona.profileId).slice(0, 4)
  for (const voter of voters) {
    if (Math.random() < 0.6) {
      const option = pick(insertedOptions)
      const inserted = await db
        .insert(pollVotes)
        .values({ pollId: poll.id, optionId: option.id, profileId: voter.profileId })
        .onConflictDoNothing()
        .returning()
      if (inserted.length > 0) {
        await db
          .update(pollOptions)
          .set({ voteCount: sql`${pollOptions.voteCount} + 1` })
          .where(eq(pollOptions.id, option.id))
      }
    }
  }

  await db
    .update(categories)
    .set({ topicCount: sql`${categories.topicCount} + 1` })
    .where(eq(categories.id, category.id))
  await log(persona.profileId, "poll-topic", title, { topicId: topic.id })
  return topic
}

// -------------------------------------------------------------- AI comment --

export async function aiComment() {
  const personas = (await loadPersonas()).filter(isActiveNow)
  if (personas.length === 0) return null
  const persona = pick(personas)

  // Recent, unlocked topics — prefer persona interests, avoid own monologues
  const candidates = await db
    .select({
      id: topics.id,
      slug: topics.slug,
      title: topics.title,
      content: topics.content,
      authorProfileId: topics.authorProfileId,
      categorySlug: categories.slug,
    })
    .from(topics)
    .innerJoin(categories, eq(topics.categoryId, categories.id))
    .where(eq(topics.isLocked, false))
    .orderBy(desc(topics.lastActivityAt))
    .limit(25)
  if (candidates.length === 0) return null

  const interested = candidates.filter((t) => persona.interests.includes(t.categorySlug))
  const topic = pick(interested.length > 0 && Math.random() < 0.75 ? interested : candidates)

  // Don't comment twice in a row on the same topic
  const [lastComment] = await db
    .select({ authorProfileId: comments.authorProfileId })
    .from(comments)
    .where(eq(comments.topicId, topic.id))
    .orderBy(desc(comments.createdAt))
    .limit(1)
  if (lastComment?.authorProfileId === persona.profileId) return null

  const thread = await db
    .select({
      id: comments.id,
      content: comments.content,
      authorProfileId: comments.authorProfileId,
      authorName: profiles.displayName,
    })
    .from(comments)
    .innerJoin(profiles, eq(comments.authorProfileId, profiles.id))
    .where(and(eq(comments.topicId, topic.id), eq(comments.isDeleted, false)))
    .orderBy(desc(comments.createdAt))
    .limit(6)

  // 35% chance to reply to an existing comment (not own)
  const replyable = thread.filter((c) => c.authorProfileId !== persona.profileId)
  const replyTo = replyable.length > 0 && Math.random() < 0.35 ? pick(replyable) : null

  const raw = await geminiText({
    system: personaSystem(persona),
    prompt: [
      `Konu başlığı: ${topic.title}`,
      `Konu içeriği: ${topic.content.slice(0, 600)}`,
      thread.length > 0
        ? `Son yorumlar (yeniden eskiye):\n${thread.map((c) => `- ${c.authorName}: ${c.content.slice(0, 200)}`).join("\n")}`
        : "Henüz yorum yok, ilk yorumu sen yapacaksın.",
      replyTo
        ? `"${replyTo.authorName}" adlı kullanıcının şu yorumuna cevap ver: "${replyTo.content.slice(0, 300)}". Ona katıl veya karşı çık, karakterine uygun davran.`
        : "Konuya kendi görüşünle yorum yap. Karakterine uygun davran; katıl, karşı çık veya dalga geç.",
      randomLengthInstruction(),
    ].join("\n\n"),
    temperature: 1.1,
  })

  const content = humanize(raw, {
    typoRate: persona.typoRate,
    casual: persona.emojiStyle === "cok",
  }).slice(0, 3000)
  if (content.length < 2) return null

  const [comment] = await db
    .insert(comments)
    .values({
      topicId: topic.id,
      parentId: replyTo?.id ?? null,
      authorProfileId: persona.profileId,
      content,
    })
    .returning()

  await db
    .update(topics)
    .set({
      commentCount: sql`${topics.commentCount} + 1`,
      lastActivityAt: new Date(),
    })
    .where(eq(topics.id, topic.id))
  await log(persona.profileId, "comment", content, { topicId: topic.id, commentId: comment.id })
  return comment
}

// ----------------------------------------------------------------- AI vote --

export async function aiVote() {
  const personas = (await loadPersonas()).filter(isActiveNow)
  if (personas.length === 0) return null
  const persona = pick(personas)

  const isTopicVote = Math.random() < 0.5
  const table = isTopicVote ? topics : comments
  const targetType = isTopicVote ? "topic" : "comment"

  const recent = await db
    .select({ id: table.id, authorProfileId: table.authorProfileId })
    .from(table)
    .orderBy(desc(table.createdAt))
    .limit(30)
  const targets = recent.filter((r) => r.authorProfileId !== persona.profileId)
  if (targets.length === 0) return null
  const target = pick(targets)

  const value = Math.random() < 0.8 ? 1 : -1
  const inserted = await db
    .insert(votes)
    .values({ profileId: persona.profileId, targetType, targetId: target.id, value })
    .onConflictDoNothing()
    .returning()
  if (inserted.length === 0) return null

  await db
    .update(table)
    .set({ score: sql`${table.score} + ${value}` })
    .where(eq(table.id, target.id))
  await db
    .update(profiles)
    .set({ karma: sql`${profiles.karma} + ${value}` })
    .where(eq(profiles.id, target.authorProfileId))
  await log(persona.profileId, "vote", `${targetType}#${target.id} ${value > 0 ? "+1" : "-1"}`)
  return inserted[0]
}

// ------------------------------------------- AI replies to real user comments --

// Process due entries from ai_reply_queue: a persona replies to a real user's
// comment 5-30 min after it was posted, making the forum feel alive.
export async function processUserReplyQueue(maxReplies = 3) {
  const due = await db
    .select()
    .from(aiReplyQueue)
    .where(and(eq(aiReplyQueue.status, "pending"), sql`${aiReplyQueue.dueAt} <= now()`))
    .orderBy(aiReplyQueue.dueAt)
    .limit(maxReplies)
  if (due.length === 0) return { processed: 0 }

  const personas = (await loadPersonas()).filter(isActiveNow)
  let processed = 0

  for (const item of due) {
    // Mark first so a crashed run can't double-reply
    await db
      .update(aiReplyQueue)
      .set({ status: "done" })
      .where(eq(aiReplyQueue.id, item.id))

    try {
      const [target] = await db
        .select({
          id: comments.id,
          content: comments.content,
          isDeleted: comments.isDeleted,
          authorProfileId: comments.authorProfileId,
          authorName: profiles.displayName,
        })
        .from(comments)
        .innerJoin(profiles, eq(comments.authorProfileId, profiles.id))
        .where(eq(comments.id, item.commentId))
        .limit(1)
      if (!target || target.isDeleted) continue

      const [topic] = await db
        .select({
          id: topics.id,
          slug: topics.slug,
          title: topics.title,
          isLocked: topics.isLocked,
          categorySlug: categories.slug,
        })
        .from(topics)
        .innerJoin(categories, eq(topics.categoryId, categories.id))
        .where(eq(topics.id, item.topicId))
        .limit(1)
      if (!topic || topic.isLocked) continue

      // Skip if someone already replied to this comment (thread is alive anyway)
      const [existingReply] = await db
        .select({ id: comments.id })
        .from(comments)
        .where(eq(comments.parentId, item.commentId))
        .limit(1)
      if (existingReply) continue

      if (personas.length === 0) continue
      const interested = personas.filter((p) => p.interests.includes(topic.categorySlug))
      const persona = pick(interested.length > 0 && Math.random() < 0.7 ? interested : personas)

      const raw = await geminiText({
        system: personaSystem(persona),
        prompt: [
          `Konu başlığı: ${topic.title}`,
          `"${target.authorName}" adlı GERÇEK bir kullanıcı şu yorumu yazdı: "${target.content.slice(0, 400)}"`,
          "Bu kullanıcıya samimi bir cevap yaz. Ona katıl, karşı çık veya sohbeti ilerlet. Karakterine uygun davran; sıcak ve doğal ol, forum arkadaşınla konuşur gibi.",
          randomLengthInstruction(),
        ].join("\n\n"),
        temperature: 1.1,
      })

      const content = humanize(raw, {
        typoRate: persona.typoRate,
        casual: persona.emojiStyle === "cok",
      }).slice(0, 3000)
      if (content.length < 2) continue

      const [reply] = await db
        .insert(comments)
        .values({
          topicId: topic.id,
          parentId: target.id,
          authorProfileId: persona.profileId,
          content,
        })
        .returning()

      await db
        .update(topics)
        .set({
          commentCount: sql`${topics.commentCount} + 1`,
          lastActivityAt: new Date(),
        })
        .where(eq(topics.id, topic.id))

      // Notify the real user that they got a reply
      await db.insert(notifications).values({
        profileId: target.authorProfileId,
        actorProfileId: persona.profileId,
        type: "reply",
        message: `${persona.displayName} yorumuna cevap verdi`,
        topicId: topic.id,
        commentId: reply.id,
      })

      await log(persona.profileId, "user-reply", content, {
        topicId: topic.id,
        commentId: reply.id,
      })
      processed++
    } catch {
      // AI quota/pause errors: mark as skipped so we don't retry forever
      await db
        .update(aiReplyQueue)
        .set({ status: "skipped" })
        .where(eq(aiReplyQueue.id, item.id))
    }
  }
  return { processed }
}

// -------------------------------------------------------- Hot topic marking --

export async function refreshHotTopics() {
  await db.update(topics).set({ isHot: false }).where(eq(topics.isHot, true))
  const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
  const hot = await db
    .select({ id: topics.id })
    .from(topics)
    .where(gte(topics.lastActivityAt, dayAgo))
    .orderBy(desc(sql`${topics.score} + ${topics.commentCount} * 2`))
    .limit(5)
  if (hot.length > 0) {
    await db
      .update(topics)
      .set({ isHot: true })
      .where(inArray(topics.id, hot.map((h) => h.id)))
  }
}

// ------------------------------------------------------------ Daily summary --

export async function generateDailySummary() {
  const today = new Date().toISOString().slice(0, 10)
  const [existing] = await db
    .select({ id: dailySummaries.id })
    .from(dailySummaries)
    .where(eq(dailySummaries.summaryDate, today))
    .limit(1)
  if (existing) return null

  const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
  const topToday = await db
    .select({ title: topics.title, score: topics.score, commentCount: topics.commentCount })
    .from(topics)
    .where(gte(topics.lastActivityAt, dayAgo))
    .orderBy(desc(sql`${topics.score} + ${topics.commentCount} * 2`))
    .limit(8)
  if (topToday.length === 0) return null

  const personas = await loadPersonas()
  const persona = personas.find((p) => p.username === "sakinbilge") ?? pick(personas)
  if (!persona) return null

  const raw = await geminiText({
    system: personaSystem(persona),
    prompt: [
      "Forumda dünün özetini yazacaksın. Başlığı 'Dün Forumda Neler Oldu' tarzında olacak.",
      `Dünün en aktif konuları:\n${topToday.map((t) => `- ${t.title} (${t.score} puan, ${t.commentCount} yorum)`).join("\n")}`,
      "Bu konuları esprili ve samimi bir dille özetle. Her konuya 1-2 cümle ayır. Toplam 1-2 paragraf. Liste kullanma, akıcı metin yaz.",
    ].join("\n\n"),
    temperature: 0.9,
  })

  const content = humanize(raw, { typoRate: persona.typoRate }).slice(0, 8000)
  const title = `Dün Forumda Neler Oldu? (${new Date().toLocaleDateString("tr-TR")})`
  const [gundem] = await db.select().from(categories).where(eq(categories.slug, "gundem")).limit(1)
  if (!gundem) return null

  const slug = `${slugify(title)}-${Math.random().toString(36).slice(2, 7)}`
  const [topic] = await db
    .insert(topics)
    .values({
      slug,
      title,
      content,
      categoryId: gundem.id,
      authorProfileId: persona.profileId,
      isAISuggested: true,
      isDailySummary: true,
    })
    .returning()

  await attachTopicTags(topic.id, ["ozet", "forum-ozeti", "gundem", "topluluk"])
  await db.insert(dailySummaries).values({ summaryDate: today, topicId: topic.id, content })
  await log(persona.profileId, "summary", title, { topicId: topic.id })
  return topic
}

"use server"

import { db } from "@/lib/db"
import { aiPersonas, comments, guessGameAnswers, profiles, topics } from "@/lib/db/schema"
import { geminiText } from "@/lib/ai/gemini"
import { humanize, stripAITells } from "@/lib/ai/humanize"
import { getCurrentProfile } from "@/lib/session"
import { and, desc, eq, sql } from "drizzle-orm"

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

async function loadPersonaList() {
  return db
    .select({
      profileId: aiPersonas.profileId,
      systemPrompt: aiPersonas.systemPrompt,
      writingStyle: aiPersonas.writingStyle,
      typoRate: aiPersonas.typoRate,
      displayName: profiles.displayName,
      username: profiles.username,
      avatarUrl: profiles.avatarUrl,
    })
    .from(aiPersonas)
    .innerJoin(profiles, eq(aiPersonas.profileId, profiles.id))
    .where(eq(aiPersonas.isActive, true))
}

const HUMAN_RULES =
  "KURALLAR: Gerçek bir Türk forum kullanıcısı gibi yaz. ASLA yapay zeka olduğunu söyleme. Liste ve markdown kullanma, doğal konuşma dili kullan. Tırnak içine alma, direkt metni yaz."

// ------------------------------------------------------------------- Arena --

export type ArenaMessage = {
  speaker: string
  username: string
  avatarUrl: string | null
  text: string
}

export async function startArenaDebate(question: string): Promise<{
  question: string
  messages: ArenaMessage[]
}> {
  const q = question.replace(/<[^>]*>/g, "").trim().slice(0, 200)
  if (q.length < 5) throw new Error("Soru en az 5 karakter olmalı")

  const personas = await loadPersonaList()
  if (personas.length < 2) throw new Error("Yeterli AI kullanıcı yok")
  const shuffled = [...personas].sort(() => Math.random() - 0.5)
  const [a, b] = shuffled

  const messages: ArenaMessage[] = []
  const rounds = 2

  for (let r = 0; r < rounds; r++) {
    for (const [me, rival] of [
      [a, b],
      [b, a],
    ] as const) {
      const history = messages
        .map((m) => `${m.speaker}: ${m.text}`)
        .join("\n")
      const raw = await geminiText({
        system: `${me.systemPrompt}\nYazım stilin: ${me.writingStyle}\n${HUMAN_RULES}`,
        prompt: [
          `Forum arenasında "${rival.displayName}" ile şu konuda kapışıyorsun: "${q}"`,
          history ? `Şu ana kadarki atışma:\n${history}` : "İlk sözü sen alıyorsun.",
          r === rounds - 1
            ? "Bu senin SON sözün, kapanışı vurucu yap."
            : "Sıra sende. Rakibine cevap ver, kendi görüşünü savun, gerekirse laf sok.",
          "En fazla 2-3 cümle yaz.",
        ].join("\n\n"),
        temperature: 1.15,
        maxOutputTokens: 300,
      })
      messages.push({
        speaker: me.displayName,
        username: me.username,
        avatarUrl: me.avatarUrl,
        text: humanize(raw, { typoRate: me.typoRate }).slice(0, 600),
      })
    }
  }

  return { question: q, messages }
}

// ------------------------------------------------------ Guess game (AI mı?) --

export type GameRound = {
  commentId: number
  content: string
  topicTitle: string
}

export async function getGameRound(): Promise<GameRound | null> {
  const rows = await db
    .select({
      commentId: comments.id,
      content: comments.content,
      topicTitle: topics.title,
    })
    .from(comments)
    .innerJoin(topics, eq(comments.topicId, topics.id))
    .where(and(eq(comments.isDeleted, false), sql`length(${comments.content}) > 40`))
    .orderBy(sql`random()`)
    .limit(1)
  return rows[0] ?? null
}

export async function submitGuess(
  commentId: number,
  guessedAI: boolean,
): Promise<{ correct: boolean; authorName: string; isAI: boolean }> {
  const [row] = await db
    .select({ isAI: profiles.isAI, displayName: profiles.displayName })
    .from(comments)
    .innerJoin(profiles, eq(comments.authorProfileId, profiles.id))
    .where(eq(comments.id, commentId))
    .limit(1)
  if (!row) throw new Error("Yorum bulunamadı")

  const correct = row.isAI === guessedAI
  const me = await getCurrentProfile()
  await db.insert(guessGameAnswers).values({
    profileId: me?.id ?? null,
    commentId,
    guessedAI,
    correct,
  })
  return { correct, authorName: row.displayName, isAI: row.isAI }
}

export async function getGameStats(): Promise<{ total: number; correct: number }> {
  const [row] = await db
    .select({
      total: sql<number>`count(*)::int`,
      correct: sql<number>`count(*) FILTER (WHERE ${guessGameAnswers.correct})::int`,
    })
    .from(guessGameAnswers)
  return { total: row?.total ?? 0, correct: row?.correct ?? 0 }
}

// -------------------------------------------------------------- Chat / Roast --

export type ChatTurn = { role: "user" | "ai"; text: string }

export async function chatWithPersona(
  personaUsername: string,
  history: ChatTurn[],
  userMessage: string,
  roastMode: boolean,
): Promise<string> {
  const msg = userMessage.replace(/<[^>]*>/g, "").trim().slice(0, 1000)
  if (!msg) throw new Error("Mesaj boş olamaz")

  const personas = await loadPersonaList()
  const persona = personas.find((p) => p.username === personaUsername) ?? pick(personas)

  const trimmed = history.slice(-10)
  const raw = await geminiText({
    system: [
      persona.systemPrompt,
      `Yazım stilin: ${persona.writingStyle}`,
      roastMode
        ? "ROAST MODU AÇIK: Kullanıcı seninle atışmak istiyor. Ona zekice, komik ve acımasız (ama küfürsüz ve kişisel saldırı içermeyen) laflar sok. Eğlenceli ol, gerçekten kırıcı olma."
        : "Kullanıcıyla forum sohbeti yapıyorsun. Karakterine sadık kal.",
      HUMAN_RULES,
    ].join("\n"),
    prompt: [
      trimmed.length > 0
        ? `Sohbet geçmişi:\n${trimmed.map((t) => `${t.role === "user" ? "Kullanıcı" : "Sen"}: ${t.text}`).join("\n")}`
        : "Sohbet yeni başlıyor.",
      `Kullanıcının mesajı: ${msg}`,
      "Cevabın en fazla 3 cümle olsun.",
    ].join("\n\n"),
    temperature: 1.1,
    maxOutputTokens: 300,
  })

  return stripAITells(raw).slice(0, 800)
}

export async function listChatPersonas() {
  const personas = await loadPersonaList()
  return personas.map((p) => ({
    username: p.username,
    displayName: p.displayName,
    avatarUrl: p.avatarUrl,
  }))
}

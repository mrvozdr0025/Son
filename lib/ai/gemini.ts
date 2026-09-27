// Central Gemini access with cost/quota management:
//  - Multiple API keys (ai_api_keys) tried in priority order; a key that hits
//    its quota is benched (exhaustedUntil) and the next one is used.
//  - Response cache (ai_response_cache) so identical prompts never hit the API twice.
//  - Daily action budget (ai_settings.dailyActionLimit); auto-pause when exceeded
//    or when every key is exhausted.
import { createHash } from "node:crypto"
import { createGoogleGenerativeAI } from "@ai-sdk/google"
import { generateText } from "ai"
import { db } from "@/lib/db"
import { aiApiKeys, aiResponseCache, aiSettings } from "@/lib/db/schema"
import { and, asc, eq, gt, isNull, lt, or, sql } from "drizzle-orm"

export const GEMINI_MODEL_ID = "gemini-3.8-flash"

export const AVAILABLE_MODELS = [
  {
    id: "gemini-3.8-flash",
    name: "Gemini 3.8 Flash",
    description: "Varsayılan, hızlı ve dengeli model. Forum tartışmaları, botlar ve özetleme için ideal.",
    badge: "Önerilen",
    tier: "Hızlı / Dengeli",
  },
  {
    id: "gemini-3.1-flash-lite",
    name: "Gemini 3.1 Flash Lite",
    description: "Ultra yüksek hız ve en düşük token maliyeti. Anlık hızlı kontroller ve filtreler için.",
    badge: "Lite",
    tier: "Ultra Hızlı",
  },
  {
    id: "gemini-3.1-pro-preview",
    name: "Gemini 3.1 Pro (Preview)",
    description: "Karmaşık mantık yürütme, derin analiz ve detaylı uzun içerik üretimi.",
    badge: "Pro",
    tier: "Derin Mantık",
  },
  {
    id: "gemini-flash-latest",
    name: "Gemini Flash (En Güncel)",
    description: "Google'ın en son kararlı Flash sürümüne otomatik dinamik yönlendirme.",
    badge: "Latest",
    tier: "Otomatik Güncel",
  },
] as const

const QUOTA_MSG =
  "AI şu an duraklatıldı: tüm API anahtarlarının kotası doldu veya günlük limit aşıldı. Admin panelinden yeni anahtar ekleyebilir veya limiti yükseltebilirsiniz."

// ------------------------------------------------------------- Settings --

export async function getAISettingsRow() {
  let [row] = await db.select().from(aiSettings).where(eq(aiSettings.id, 1)).limit(1)
  if (!row) {
    ;[row] = await db.insert(aiSettings).values({ id: 1 }).onConflictDoNothing().returning()
    if (!row) [row] = await db.select().from(aiSettings).where(eq(aiSettings.id, 1)).limit(1)
  }
  // New day: reset the usage counter.
  const today = new Date().toISOString().slice(0, 10)
  if (row.usageDate !== today) {
    const [updated] = await db
      .update(aiSettings)
      .set({ dailyUsed: 0, usageDate: today, updatedAt: new Date() })
      .where(eq(aiSettings.id, 1))
      .returning()
    if (updated) row = updated
    // Auto-resume if it was auto-paused for quota reasons.
    if (row.isPaused && row.pausedReason === "auto:limit") {
      const [resumed] = await db
        .update(aiSettings)
        .set({ isPaused: false, pausedReason: null, updatedAt: new Date() })
        .where(eq(aiSettings.id, 1))
        .returning()
      if (resumed) row = resumed
    }
  }
  return row
}

async function consumeBudget(): Promise<void> {
  const settings = await getAISettingsRow()
  if (settings.isPaused) throw new Error(QUOTA_MSG)
  if (settings.dailyUsed >= settings.dailyActionLimit) {
    await db
      .update(aiSettings)
      .set({ isPaused: true, pausedReason: "auto:limit", updatedAt: new Date() })
      .where(eq(aiSettings.id, 1))
    throw new Error(QUOTA_MSG)
  }
  await db
    .update(aiSettings)
    .set({ dailyUsed: sql`${aiSettings.dailyUsed} + 1`, updatedAt: new Date() })
    .where(eq(aiSettings.id, 1))
}

// ---------------------------------------------------------------- Cache --

function cacheKeyFor(modelId: string, system: string, prompt: string): string {
  return createHash("sha256").update(`${modelId}\n${system}\n${prompt}`).digest("hex")
}

async function cacheGet(key: string): Promise<string | null> {
  const [hit] = await db
    .select()
    .from(aiResponseCache)
    .where(and(eq(aiResponseCache.cacheKey, key), gt(aiResponseCache.expiresAt, new Date())))
    .limit(1)
  if (!hit) return null
  await db
    .update(aiResponseCache)
    .set({ hitCount: sql`${aiResponseCache.hitCount} + 1` })
    .where(eq(aiResponseCache.id, hit.id))
  return hit.response
}

async function cacheSet(key: string, response: string, ttlMinutes: number): Promise<void> {
  const expiresAt = new Date(Date.now() + ttlMinutes * 60_000)
  await db
    .insert(aiResponseCache)
    .values({ cacheKey: key, response, expiresAt })
    .onConflictDoUpdate({
      target: aiResponseCache.cacheKey,
      set: { response, expiresAt },
    })
  // Opportunistic cleanup of expired rows (cheap, bounded).
  await db.delete(aiResponseCache).where(lt(aiResponseCache.expiresAt, new Date()))
}

// ------------------------------------------------------------ Key pool --

function isQuotaError(e: unknown): boolean {
  const msg = e instanceof Error ? e.message : String(e)
  return (
    msg.includes("429") ||
    msg.toLowerCase().includes("quota") ||
    msg.toLowerCase().includes("resource_exhausted") ||
    msg.toLowerCase().includes("rate limit")
  )
}

async function getUsableKeys() {
  const now = new Date()
  const rows = await db
    .select()
    .from(aiApiKeys)
    .where(
      and(
        eq(aiApiKeys.isActive, true),
        or(isNull(aiApiKeys.exhaustedUntil), lt(aiApiKeys.exhaustedUntil, now)),
      ),
    )
    .orderBy(asc(aiApiKeys.priority), asc(aiApiKeys.id))
  const pool: { id: number | null; apiKey: string }[] = rows.map((r) => ({
    id: r.id,
    apiKey: r.apiKey,
  }))
  // Env var key acts as the final fallback (id: null → not tracked in DB).
  const envKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY
  if (envKey && !rows.some((r) => r.apiKey === envKey)) {
    pool.push({ id: null, apiKey: envKey })
  }
  return pool
}

async function benchKey(keyId: number): Promise<void> {
  // Bench a quota-exhausted key for 6 hours (free tier quotas reset daily).
  await db
    .update(aiApiKeys)
    .set({
      exhaustedUntil: new Date(Date.now() + 6 * 60 * 60 * 1000),
      errorCount: sql`${aiApiKeys.errorCount} + 1`,
    })
    .where(eq(aiApiKeys.id, keyId))
}

// ------------------------------------------------------------ Main API --

export async function geminiText(opts: {
  system: string
  prompt: string
  modelId?: string
  temperature?: number
  maxOutputTokens?: number
  /** Skip cache for prompts that should always produce fresh output. */
  noCache?: boolean
  /** Enable Google Search grounding for up-to-date real-world info (trend topics). */
  useSearch?: boolean
}): Promise<string> {
  const settings = await getAISettingsRow()
  const modelId = opts.modelId || settings.modelId || GEMINI_MODEL_ID
  const temperature = opts.temperature ?? settings.temperature ?? 1.0
  const maxOutputTokens = opts.maxOutputTokens ?? settings.maxTokens ?? 2048

  // Search-grounded responses are time-sensitive; never serve them from cache.
  const skipCache = opts.noCache || opts.useSearch

  // 1. Cache first — a hit costs nothing and ignores pause/limit states.
  const key = cacheKeyFor(modelId, opts.system, opts.prompt)
  if (!skipCache) {
    const cached = await cacheGet(key)
    if (cached) return cached
  }

  // 2. Budget check (throws when paused or over the daily limit).
  await consumeBudget()

  // 3. Try keys in priority order; bench exhausted ones and move on.
  const pool = await getUsableKeys()
  if (pool.length === 0) {
    await db
      .update(aiSettings)
      .set({ isPaused: true, pausedReason: "auto:keys", updatedAt: new Date() })
      .where(eq(aiSettings.id, 1))
    throw new Error(QUOTA_MSG)
  }

  let lastError: unknown = null
  for (const entry of pool) {
    try {
      const provider = createGoogleGenerativeAI({ apiKey: entry.apiKey })
      const { text } = await generateText({
        model: provider(modelId),
        system: opts.system,
        prompt: opts.prompt,
        temperature,
        maxOutputTokens,
        // Google Search grounding: model searches the web before answering.
        ...(opts.useSearch
          ? { tools: { google_search: provider.tools.googleSearch({}) } }
          : {}),
        providerOptions: {
          google: {
            thinkingConfig: { thinkingBudget: 0 },
          },
        },
      })
      const result = text.trim()
      if (entry.id !== null) {
        await db
          .update(aiApiKeys)
          .set({ lastUsedAt: new Date() })
          .where(eq(aiApiKeys.id, entry.id))
      }
      if (!skipCache) await cacheSet(key, result, settings.cacheTtlMinutes)
      return result
    } catch (e) {
      lastError = e
      if (isQuotaError(e)) {
        if (entry.id !== null) await benchKey(entry.id)
        continue // try the next key
      }
      throw e // non-quota errors bubble up immediately
    }
  }

  // Every key failed with a quota error → auto-pause.
  await db
    .update(aiSettings)
    .set({ isPaused: true, pausedReason: "auto:keys", updatedAt: new Date() })
    .where(eq(aiSettings.id, 1))
  throw new Error(QUOTA_MSG, { cause: lastError })
}

// ----------------------------------------------------------- Direct API Test --

export type TestResult = {
  success: boolean
  modelId: string
  text?: string
  latencyMs: number
  keyPreview: string
  charCount?: number
  error?: string
}

export async function testGeminiApiDirectly(opts: {
  prompt: string
  modelId?: string
  temperature?: number
}): Promise<TestResult> {
  const startTime = performance.now()
  const settings = await getAISettingsRow()
  const modelId = opts.modelId?.trim() || settings.modelId || GEMINI_MODEL_ID
  const pool = await getUsableKeys()

  if (pool.length === 0) {
    return {
      success: false,
      modelId,
      latencyMs: Math.round(performance.now() - startTime),
      keyPreview: "Yok (Tüm anahtarlar tükendi veya tanımlı anahtar yok)",
      error:
        "Kullanılabilir API anahtarı bulunamadı. Lütfen aşağıdan yeni bir anahtar ekleyin veya GEMINI_API_KEY ortam değişkenini kontrol edin.",
    }
  }

  let lastError = ""
  for (const entry of pool) {
    const keyPreview =
      entry.apiKey.length > 12
        ? `${entry.apiKey.slice(0, 8)}...${entry.apiKey.slice(-4)}`
        : "Gizli Anahtar"
    try {
      const provider = createGoogleGenerativeAI({ apiKey: entry.apiKey })
      const { text } = await generateText({
        model: provider(modelId),
        system:
          "Sen Neonsform forumunun yapay zeka asistanısın. Test taleplerine doğrudan, açık ve net Türkçe yanıtlar verirsin.",
        prompt: opts.prompt,
        temperature: opts.temperature ?? settings.temperature ?? 0.7,
        maxOutputTokens: 1024,
      })
      const latencyMs = Math.round(performance.now() - startTime)
      const cleanText = text.trim()

      if (entry.id !== null) {
        await db
          .update(aiApiKeys)
          .set({ lastUsedAt: new Date() })
          .where(eq(aiApiKeys.id, entry.id))
      }

      return {
        success: true,
        modelId,
        text: cleanText,
        latencyMs,
        keyPreview,
        charCount: cleanText.length,
      }
    } catch (err: any) {
      lastError = err?.message || String(err)
      if (isQuotaError(err) && entry.id !== null) {
        await benchKey(entry.id)
      }
    }
  }

  return {
    success: false,
    modelId,
    latencyMs: Math.round(performance.now() - startTime),
    keyPreview: "Başarısız",
    error: lastError || "API isteği işlenemedi.",
  }
}


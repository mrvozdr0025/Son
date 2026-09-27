import { geminiText } from "@/lib/ai/gemini"
import { db } from "@/lib/db"
import { topics } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { generateTopicSummaryAndFaq, type TopicSummaryAndFaq, type FaqItem } from "@/lib/seo"

export interface AITopicFaqResult {
  summary: {
    overview: string
    keyTakeaways: string[]
  }
  faqs: FaqItem[]
  isAI: boolean
}

/**
 * Generates an SEO-optimized Topic Summary and FAQ using Gemini AI.
 * Caches result in `topics.aiSummary` column in the database so it's loaded instantly on future views.
 * If AI service is paused or unconfigured, falls back to deterministic context-aware generator.
 */
export async function getOrGenerateTopicFaq(
  topic: {
    id: number
    title: string
    content: string
    categoryName?: string
    aiSummary?: string | null
  },
  forceRefresh = false
): Promise<AITopicFaqResult> {
  // 1. Check if already stored in DB and valid
  if (!forceRefresh && topic.aiSummary) {
    try {
      const parsed = JSON.parse(topic.aiSummary)
      if (parsed && typeof parsed.overview === "string" && Array.isArray(parsed.faqs) && parsed.faqs.length > 0) {
        return {
          summary: {
            overview: parsed.overview,
            keyTakeaways: Array.isArray(parsed.keyTakeaways) ? parsed.keyTakeaways : [],
          },
          faqs: parsed.faqs,
          isAI: true,
        }
      }
    } catch {
      // Invalid JSON, proceed to generation
    }
  }

  // 2. Generate with Gemini AI
  try {
    const systemPrompt = `Sen Türkiye'nin en canlı tartışma ve teknoloji platformu neonsform.com için çalışan uzman bir SEO ve İçerik Yapay Zekasısın.
Görevin: Verilen forum konusu için arama motorlarında (Google) en üst sıralara çıkacak, organik aramalarda zengin snippet (Rich Snippets / FAQPage schema) sağlayacak ve kullanıcılara en yüksek değeri sunacak SEO uyumlu bir "Konu Özeti" ve "Sıkça Sorulan Sorular (SEO FAQ)" üretmektir.

KURALLAR:
1. Konu metnini veya başlığı ASLA olduğu gibi tekrar kopyalama.
2. "overview" (Konu Özeti): Konunun ana fikrini, tartışılan temel sorunu veya gelişmeyi, kullanıcı deneyimlerini 2-3 profesyonel, akıcı ve bilgilendirici Türkçe cümleyle sentezle.
3. "keyTakeaways" (Önemli Noktalar): Konudan ve tartışmalardan çıkarılan 3 somut, faydalı ve bilgilendirici madde (array of string).
4. "faqs" (Sıkça Sorulan Sorular): Kullanıcıların Google'da arayabileceği doğrudan konuyla ilişkili 3 ila 4 soru ve her birine konudaki gerçek verilere/fikirlere dayanan net, detaylı ve doyurucu cevaplar (array of { question, answer }).
5. Çıktı SADECE ve kesinlikle geçerli bir JSON objesi formatında olmalı, markdown etiketleri dışında hiçbir fazlalık metin ekleme:
{
  "overview": "...",
  "keyTakeaways": ["...", "...", "..."],
  "faqs": [
    { "question": "...", "answer": "..." }
  ]
}`

    const userPrompt = `Kategori: ${topic.categoryName || "Genel"}
Konu Başlığı: ${topic.title}
Konu İçeriği:
${topic.content.slice(0, 3500)}

Lütfen yukarıdaki konuyu analiz ederek SEO uyumlu Konu Özeti, Önemli Noktalar ve Sıkça Sorulan Sorular JSON objesini oluştur.`

    const rawResponse = await geminiText({
      system: systemPrompt,
      prompt: userPrompt,
      temperature: 0.7,
      maxOutputTokens: 2048,
      noCache: forceRefresh,
    })

    const jsonMatch = rawResponse.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0])
      if (parsed && typeof parsed.overview === "string" && Array.isArray(parsed.faqs) && parsed.faqs.length > 0) {
        const resultData = {
          overview: parsed.overview,
          keyTakeaways: Array.isArray(parsed.keyTakeaways) ? parsed.keyTakeaways : [],
          faqs: parsed.faqs,
        }

        // Asynchronously persist to database so future visits are instantaneous
        db.update(topics)
          .set({ aiSummary: JSON.stringify(resultData) })
          .where(eq(topics.id, topic.id))
          .catch((err) => console.error("Failed to cache aiSummary in db:", err))

        return {
          summary: {
            overview: resultData.overview,
            keyTakeaways: resultData.keyTakeaways,
          },
          faqs: resultData.faqs,
          isAI: true,
        }
      }
    }
  } catch (err) {
    console.warn("Gemini AI FAQ generation encountered an issue, using fallback generator:", err)
  }

  // 3. Fallback to high-quality deterministic SEO generator
  const fallback = generateTopicSummaryAndFaq(topic.title, topic.content, topic.categoryName)
  return {
    summary: fallback.summary,
    faqs: fallback.faqs,
    isAI: false,
  }
}

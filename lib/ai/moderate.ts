import "server-only"
import { db } from "@/lib/db"
import { comments, reports } from "@/lib/db/schema"
import { geminiText } from "@/lib/ai/gemini"
import { eq } from "drizzle-orm"

// Automated toxicity screening for real-user comments. Runs after the
// comment is created (via next/server `after`) so it never blocks posting.
// Flagged comments get isToxic=true and an auto report (reporterProfileId=null)
// for admins to review — content stays visible until a human decides.
export async function moderateComment(commentId: number, content: string) {
  try {
    const verdict = await geminiText({
      system: [
        "Sen bir Türkçe forum moderasyon asistanısın.",
        "Sana verilen yorumu değerlendir ve SADECE şu formatta cevap ver:",
        'GÜVENLI veya TOKSIK|<kısa sebep>',
        "TOKSIK kriterleri: hakaret, nefret söylemi, taciz, tehdit, ırkçılık, cinsiyetçilik, spam, kişisel bilgi ifşası.",
        "Sert ama saygılı eleştiri, argo, mizah ve tartışma TOKSIK DEĞİLDİR. Şüphede kalırsan GÜVENLI de.",
      ].join("\n"),
      prompt: `Yorum: "${content.slice(0, 1000)}"`,
      temperature: 0.1,
      maxOutputTokens: 100,
    })

    const normalized = verdict.trim().toUpperCase()
    if (!normalized.startsWith("TOKSIK")) return

    const reason = verdict.split("|")[1]?.trim().slice(0, 200) ?? "otomatik tespit"

    await db.update(comments).set({ isToxic: true }).where(eq(comments.id, commentId))
    await db.insert(reports).values({
      reporterProfileId: null, // null = AI moderatör
      targetType: "comment",
      targetId: commentId,
      reason: `[AI Moderatör] ${reason}`,
    })
  } catch {
    // Moderation is best-effort: quota errors or pauses must never affect posting
  }
}

"use server"

import { getTopicBySlug } from "@/lib/queries"
import { getOrGenerateTopicFaq } from "@/lib/ai/topic-faq"
import { revalidatePath } from "next/cache"

export async function refreshTopicFaqAction(slug: string) {
  try {
    const topic = await getTopicBySlug(slug)
    if (!topic) return { success: false, error: "Konu bulunamadı" }

    const result = await getOrGenerateTopicFaq(
      {
        id: topic.id,
        title: topic.title,
        content: topic.content,
        categoryName: topic.categoryName,
        aiSummary: topic.aiSummary,
      },
      true // force refresh
    )

    revalidatePath(`/konu/${slug}`)
    return { success: true, data: result }
  } catch (err: any) {
    return { success: false, error: err?.message || "AI özeti yenilenemedi" }
  }
}

import { aiCreateTopic } from "@/lib/ai/orchestrator"

export const maxDuration = 120

// Daily 09:00 TR: open the day's discussion topic.
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization")
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response("Unauthorized", { status: 401 })
  }
  const topic = await aiCreateTopic({ isDailyTopic: true })
  return Response.json({ ok: Boolean(topic), slug: topic?.slug ?? null })
}

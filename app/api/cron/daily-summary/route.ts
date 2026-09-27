import { generateDailySummary } from "@/lib/ai/orchestrator"

export const maxDuration = 120

// Daily 07:00 TR: post yesterday's recap.
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization")
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response("Unauthorized", { status: 401 })
  }
  const topic = await generateDailySummary()
  return Response.json({ ok: Boolean(topic), slug: topic?.slug ?? null })
}

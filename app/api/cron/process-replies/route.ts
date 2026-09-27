import { processUserReplyQueue } from "@/lib/ai/orchestrator"

export const maxDuration = 120

// Lightweight endpoint for frequent scheduling (e.g. every 10 min on
// cron-job.org): replies to real users' comments 5-30 min after posting.
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization")
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response("Unauthorized", { status: 401 })
  }

  try {
    const result = await processUserReplyQueue(3)
    return Response.json(result)
  } catch (e) {
    return Response.json(
      { processed: 0, error: e instanceof Error ? e.message : "unknown" },
      { status: 500 },
    )
  }
}

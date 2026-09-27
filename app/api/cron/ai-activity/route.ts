import {
  aiComment,
  aiCreatePollTopic,
  aiCreateTopic,
  aiCreateTrendTopic,
  aiVote,
  processUserReplyQueue,
  refreshHotTopics,
} from "@/lib/ai/orchestrator"

export const maxDuration = 300

// Hourly: a few comments, votes, and occasionally a new topic.
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization")
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response("Unauthorized", { status: 401 })
  }

  const results = { userReplies: 0, comments: 0, votes: 0, topics: 0, errors: [] as string[] }

  // Priority 1: reply to real users' comments (feels most alive)
  try {
    const r = await processUserReplyQueue(3)
    results.userReplies = r.processed
  } catch (e) {
    results.errors.push(`user-reply: ${e instanceof Error ? e.message : "unknown"}`)
  }

  const commentCount = 2 + Math.floor(Math.random() * 3) // 2-4
  for (let i = 0; i < commentCount; i++) {
    try {
      const c = await aiComment()
      if (c) results.comments++
    } catch (e) {
      results.errors.push(`comment: ${e instanceof Error ? e.message : "unknown"}`)
    }
  }

  const voteCount = 3 + Math.floor(Math.random() * 4) // 3-6
  for (let i = 0; i < voteCount; i++) {
    try {
      const v = await aiVote()
      if (v) results.votes++
    } catch (e) {
      results.errors.push(`vote: ${e instanceof Error ? e.message : "unknown"}`)
    }
  }

  // ~45% chance of a fresh topic each hour; type is rolled:
  //  - 40% normal topic, 35% current-news trend topic (search grounded), 25% poll topic
  if (Math.random() < 0.45) {
    const roll = Math.random()
    try {
      const t =
        roll < 0.4
          ? await aiCreateTopic()
          : roll < 0.75
            ? await aiCreateTrendTopic()
            : await aiCreatePollTopic()
      if (t) results.topics++
    } catch (e) {
      results.errors.push(`topic: ${e instanceof Error ? e.message : "unknown"}`)
    }
  }

  try {
    await refreshHotTopics()
  } catch (e) {
    results.errors.push(`hot: ${e instanceof Error ? e.message : "unknown"}`)
  }

  return Response.json(results)
}

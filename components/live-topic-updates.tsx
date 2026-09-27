"use client"

import { useRef } from "react"
import { useRouter } from "next/navigation"
import useSWR from "swr"

const fetcher = (url: string) => fetch(url).then((r) => r.json())

type Live = { commentCount: number; score: number }

// Polls the topic's live endpoint every 15s. When the comment count or score
// changes (someone else commented/voted), refreshes the RSC payload so new
// content appears without a manual page reload.
export function LiveTopicUpdates({
  topicId,
  initialCommentCount,
  initialScore,
}: {
  topicId: number
  initialCommentCount: number
  initialScore: number
}) {
  const router = useRouter()
  const last = useRef<Live>({ commentCount: initialCommentCount, score: initialScore })

  useSWR<Live>(`/api/topics/${topicId}/live`, fetcher, {
    refreshInterval: 15000,
    revalidateOnFocus: true,
    onSuccess: (data) => {
      if (!data || typeof data.commentCount !== "number") return
      if (
        data.commentCount !== last.current.commentCount ||
        data.score !== last.current.score
      ) {
        last.current = { commentCount: data.commentCount, score: data.score }
        router.refresh()
      }
    },
  })

  return null
}

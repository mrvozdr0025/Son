"use client"

import { useEffect, useState } from "react"
import { Check } from "lucide-react"

export function ReadStatusBadge({ topicId }: { topicId: number }) {
  const [isRead, setIsRead] = useState(false)

  useEffect(() => {
    const checkStatus = () => {
      try {
        const stored = localStorage.getItem("neon_read_topics")
        if (stored) {
          const ids = JSON.parse(stored) as number[]
          setIsRead(ids.includes(topicId))
        } else {
          setIsRead(false)
        }
      } catch {
        setIsRead(false)
      }
    }

    checkStatus()

    const handleReadChange = (e: any) => {
      if (e.detail?.topicId === topicId) {
        setIsRead(e.detail.isRead)
      } else {
        checkStatus()
      }
    }

    window.addEventListener("topic-read-change", handleReadChange)
    return () => window.removeEventListener("topic-read-change", handleReadChange)
  }, [topicId])

  if (!isRead) return null

  return (
    <span
      title="Bu konuyu okudunuz"
      className="inline-flex items-center gap-1 rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground border border-border/60"
    >
      <Check className="size-3 text-emerald-400" />
      <span>Okundu</span>
    </span>
  )
}

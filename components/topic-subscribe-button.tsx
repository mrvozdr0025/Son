"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toggleFollow } from "@/app/actions/follow"
import { Button } from "@/components/ui/button"
import { Bell, BellRing, Loader2 } from "lucide-react"

export function TopicSubscribeButton({
  topicId,
  initialFollowing,
  initialCount = 0,
  isAuthed,
}: {
  topicId: number
  initialFollowing: boolean
  initialCount?: number
  isAuthed: boolean
}) {
  const router = useRouter()
  const [following, setFollowing] = useState(initialFollowing)
  const [count, setCount] = useState(initialCount)
  const [pending, startTransition] = useTransition()

  function handleToggle() {
    if (!isAuthed) {
      router.push("/giris")
      return
    }

    const nextState = !following
    setFollowing(nextState)
    setCount((c) => (nextState ? c + 1 : Math.max(0, c - 1)))

    startTransition(async () => {
      try {
        const res = await toggleFollow("topic", topicId)
        setFollowing(res.following)
      } catch {
        // Rollback on error
        setFollowing(following)
        setCount(initialCount)
      }
    })
  }

  return (
    <Button
      type="button"
      size="sm"
      variant={following ? "secondary" : "outline"}
      onClick={handleToggle}
      disabled={pending}
      title={following ? "Konu takibini bırak" : "Konuya yeni yorum gelince bildirim al"}
      className={`h-8 gap-1.5 text-xs font-medium transition-all ${
        following
          ? "border-primary/40 bg-primary/10 text-primary hover:bg-primary/20"
          : "hover:border-primary/50"
      }`}
    >
      {pending ? (
        <Loader2 className="size-3.5 animate-spin" />
      ) : following ? (
        <BellRing className="size-3.5 text-primary" />
      ) : (
        <Bell className="size-3.5" />
      )}
      <span>{following ? "Takip Ediliyor" : "Konuyu Takip Et"}</span>
      {count > 0 && (
        <span className="ml-0.5 rounded-full bg-muted px-1.5 py-0.2 font-mono text-[10px] text-muted-foreground">
          {count}
        </span>
      )}
    </Button>
  )
}

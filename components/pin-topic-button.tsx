"use client"

import { useState, useTransition } from "react"
import { togglePinTopic } from "@/app/actions/forum"
import { Button } from "@/components/ui/button"
import { Loader2, Pin } from "lucide-react"

export function PinTopicButton({
  topicId,
  initialPinned,
  canPin,
}: {
  topicId: number
  initialPinned: boolean
  canPin: boolean
}) {
  const [pinned, setPinned] = useState(initialPinned)
  const [pending, startTransition] = useTransition()

  if (!canPin) return null

  function handleToggle() {
    const nextState = !pinned
    setPinned(nextState)

    startTransition(async () => {
      try {
        const res = await togglePinTopic(topicId)
        setPinned(res.isPinned)
      } catch (err) {
        setPinned(pinned)
      }
    })
  }

  return (
    <Button
      type="button"
      size="sm"
      variant={pinned ? "secondary" : "outline"}
      onClick={handleToggle}
      disabled={pending}
      title={pinned ? "Sabitlemeyi kaldır" : "Konuyu kategori başında sabitle"}
      className={`h-8 gap-1.5 text-xs font-medium transition-all ${
        pinned
          ? "border-amber-500/40 bg-amber-500/10 text-amber-500 hover:bg-amber-500/20"
          : "hover:border-amber-500/40 hover:text-amber-500"
      }`}
    >
      {pending ? (
        <Loader2 className="size-3.5 animate-spin" />
      ) : (
        <Pin className={`size-3.5 ${pinned ? "fill-amber-500/30" : ""}`} />
      )}
      <span>{pinned ? "Sabitlendi" : "Sabitle"}</span>
    </Button>
  )
}

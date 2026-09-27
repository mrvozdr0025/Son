"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toggleCommentReaction, type ReactionSummary } from "@/app/actions/reactions"
import { ALLOWED_EMOJIS } from "@/lib/constants"
import { SmilePlus } from "lucide-react"

export function CommentReactions({
  commentId,
  initialReactions = [],
  isAuthed,
}: {
  commentId: number
  initialReactions: ReactionSummary[]
  isAuthed: boolean
}) {
  const router = useRouter()
  const [reactions, setReactions] = useState<ReactionSummary[]>(initialReactions)
  const [showPicker, setShowPicker] = useState(false)
  const [pending, startTransition] = useTransition()

  function handleToggle(emoji: string) {
    if (!isAuthed) {
      router.push("/giris")
      return
    }

    setShowPicker(false)

    // Optimistic UI update
    setReactions((prev) => {
      const idx = prev.findIndex((r) => r.emoji === emoji)
      if (idx >= 0) {
        const item = prev[idx]
        const newHasReacted = !item.hasReacted
        const newCount = newHasReacted ? item.count + 1 : item.count - 1
        if (newCount <= 0 && !newHasReacted) {
          return prev.filter((_, i) => i !== idx)
        }
        const updated = [...prev]
        updated[idx] = { ...item, count: newCount, hasReacted: newHasReacted }
        return updated
      } else {
        return [...prev, { emoji, count: 1, hasReacted: true }]
      }
    })

    startTransition(async () => {
      try {
        await toggleCommentReaction(commentId, emoji)
      } catch (err) {
        // Rollback on error
        setReactions(initialReactions)
      }
    })
  }

  return (
    <div className="relative mt-2 flex flex-wrap items-center gap-1.5 text-xs">
      {reactions.map((r) => (
        <button
          key={r.emoji}
          type="button"
          onClick={() => handleToggle(r.emoji)}
          disabled={pending}
          className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs transition-all ${
            r.hasReacted
              ? "border-primary/50 bg-primary/15 font-semibold text-primary shadow-sm"
              : "border-border bg-secondary/40 text-muted-foreground hover:border-border hover:bg-secondary/80 hover:text-foreground"
          }`}
          title={`${r.count} kişi tepki verdi`}
        >
          <span>{r.emoji}</span>
          <span className="font-mono text-[11px]">{r.count}</span>
        </button>
      ))}

      <div className="relative inline-block">
        <button
          type="button"
          onClick={() => setShowPicker(!showPicker)}
          className="inline-flex size-6 items-center justify-center rounded-full border border-dashed border-border/80 text-muted-foreground transition-colors hover:border-primary/50 hover:bg-muted hover:text-foreground"
          aria-label="Emoji tepkisi ekle"
          title="Tepki ekle"
        >
          <SmilePlus className="size-3.5" />
        </button>

        {showPicker && (
          <div
            className="absolute bottom-full left-0 z-50 mb-1.5 flex items-center gap-1 rounded-full border border-border bg-popover/95 p-1 shadow-lg backdrop-blur-md animate-in fade-in zoom-in-95 duration-100"
            onMouseLeave={() => setShowPicker(false)}
          >
            {ALLOWED_EMOJIS.map((emoji) => {
              const current = reactions.find((r) => r.emoji === emoji)
              return (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => handleToggle(emoji)}
                  className={`flex size-7 items-center justify-center rounded-full text-sm transition-transform hover:scale-125 ${
                    current?.hasReacted ? "bg-primary/20" : "hover:bg-muted"
                  }`}
                >
                  {emoji}
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

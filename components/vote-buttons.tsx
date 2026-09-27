"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { castVote } from "@/app/actions/forum"
import { cn } from "@/lib/utils"
import { ArrowBigDown, ArrowBigUp } from "lucide-react"

export function VoteButtons({
  targetType,
  targetId,
  score,
  isAuthed,
  orientation = "vertical",
}: {
  targetType: "topic" | "comment"
  targetId: number
  score: number
  isAuthed: boolean
  orientation?: "vertical" | "horizontal"
}) {
  const router = useRouter()
  const [localScore, setLocalScore] = useState(score)
  const [myVote, setMyVote] = useState<0 | 1 | -1>(0)
  const [pending, startTransition] = useTransition()

  function vote(value: 1 | -1) {
    if (!isAuthed) {
      router.push("/giris")
      return
    }
    if (pending) return
    const prev = { localScore, myVote }
    // optimistic
    if (myVote === value) {
      setLocalScore((s) => s - value)
      setMyVote(0)
    } else {
      setLocalScore((s) => s + value - myVote)
      setMyVote(value)
    }
    startTransition(async () => {
      try {
        await castVote(targetType, targetId, value)
      } catch {
        setLocalScore(prev.localScore)
        setMyVote(prev.myVote)
      }
    })
  }

  return (
    <div
      className={cn(
        "flex items-center gap-0.5",
        orientation === "vertical" ? "flex-col" : "flex-row",
      )}
    >
      <button
        type="button"
        onClick={() => vote(1)}
        aria-label="Beğen"
        className={cn(
          "rounded-md p-1 transition-colors hover:bg-primary/10 hover:text-primary",
          myVote === 1 ? "text-primary" : "text-muted-foreground",
        )}
      >
        <ArrowBigUp className="size-5" fill={myVote === 1 ? "currentColor" : "none"} />
      </button>
      <span
        className={cn(
          "min-w-6 text-center font-mono text-sm font-semibold tabular-nums",
          localScore > 0 ? "text-foreground" : "text-muted-foreground",
        )}
      >
        {localScore}
      </span>
      <button
        type="button"
        onClick={() => vote(-1)}
        aria-label="Beğenme"
        className={cn(
          "rounded-md p-1 transition-colors hover:bg-destructive/10 hover:text-destructive",
          myVote === -1 ? "text-destructive" : "text-muted-foreground",
        )}
      >
        <ArrowBigDown className="size-5" fill={myVote === -1 ? "currentColor" : "none"} />
      </button>
    </div>
  )
}

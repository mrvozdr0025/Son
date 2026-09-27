"use client"

import { useState, useTransition } from "react"
import { votePoll } from "@/app/actions/forum"
import { Button } from "@/components/ui/button"
import { BarChart3 } from "lucide-react"

type PollOption = { id: number; text: string; voteCount: number }

export function PollWidget({
  pollId,
  question,
  options,
  isAuthed,
}: {
  pollId: number
  question: string
  options: PollOption[]
  isAuthed: boolean
}) {
  const [pending, startTransition] = useTransition()
  const [voted, setVoted] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const total = options.reduce((sum, o) => sum + o.voteCount, 0)

  function handleVote(optionId: number) {
    if (!isAuthed) {
      setError("Oy vermek için giriş yapmalısın")
      return
    }
    setError(null)
    startTransition(async () => {
      try {
        await votePoll(pollId, optionId)
        setVoted(true)
      } catch (e) {
        setError(e instanceof Error ? e.message : "Bir hata oluştu")
      }
    })
  }

  return (
    <div className="rounded-xl border border-border bg-card/60 p-4">
      <div className="mb-3 flex items-center gap-2">
        <BarChart3 className="size-4 text-primary" aria-hidden="true" />
        <h2 className="text-sm font-semibold text-foreground text-balance">{question}</h2>
      </div>
      <div className="flex flex-col gap-2">
        {options.map((opt) => {
          const pct = total > 0 ? Math.round((opt.voteCount / total) * 100) : 0
          return (
            <div key={opt.id} className="relative overflow-hidden rounded-lg border border-border/60">
              <div
                className="absolute inset-y-0 left-0 bg-primary/15 transition-all"
                style={{ width: `${pct}%` }}
                aria-hidden="true"
              />
              <Button
                type="button"
                variant="ghost"
                disabled={pending || voted}
                onClick={() => handleVote(opt.id)}
                className="relative h-auto w-full justify-between px-3 py-2 text-left text-sm"
              >
                <span className="text-pretty">{opt.text}</span>
                <span className="ml-2 shrink-0 font-mono text-xs text-muted-foreground">
                  {pct}% ({opt.voteCount})
                </span>
              </Button>
            </div>
          )
        })}
      </div>
      <p className="mt-2 text-xs text-muted-foreground">{total} oy kullanıldı</p>
      {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
    </div>
  )
}

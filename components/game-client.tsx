"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Bot, User, Gamepad2, Loader2, ArrowRight } from "lucide-react"
import { getGameRound, submitGuess, type GameRound } from "@/app/actions/viral"

type Result = { correct: boolean; authorName: string; isAI: boolean }

export function GameClient({
  initialRound,
  globalStats,
}: {
  initialRound: GameRound | null
  globalStats: { total: number; correct: number }
}) {
  const [round, setRound] = useState<GameRound | null>(initialRound)
  const [result, setResult] = useState<Result | null>(null)
  const [score, setScore] = useState({ total: 0, correct: 0 })
  const [streak, setStreak] = useState(0)
  const [loading, setLoading] = useState(false)

  async function guess(guessedAI: boolean) {
    if (!round || loading) return
    setLoading(true)
    try {
      const r = await submitGuess(round.commentId, guessedAI)
      setResult(r)
      setScore((s) => ({ total: s.total + 1, correct: s.correct + (r.correct ? 1 : 0) }))
      setStreak((s) => (r.correct ? s + 1 : 0))
    } finally {
      setLoading(false)
    }
  }

  async function next() {
    setLoading(true)
    setResult(null)
    try {
      const r = await getGameRound()
      setRound(r)
    } finally {
      setLoading(false)
    }
  }

  const globalPct =
    globalStats.total > 0 ? Math.round((globalStats.correct / globalStats.total) * 100) : null

  return (
    <div className="flex flex-col gap-6">
      <div className="text-center">
        <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-2xl bg-accent/15 text-accent">
          <Gamepad2 className="size-6" />
        </div>
        <h1 className="text-2xl font-bold text-balance">AI mı İnsan mı?</h1>
        <p className="mt-1 text-sm text-muted-foreground text-pretty">
          Bu yorumu kim yazdı sence? Bir yapay zeka mı, gerçek bir insan mı?
        </p>
      </div>

      <div className="flex justify-center gap-6 text-center text-sm">
        <div>
          <p className="text-lg font-bold text-primary">
            {score.correct}/{score.total}
          </p>
          <p className="text-xs text-muted-foreground">Skorun</p>
        </div>
        <div>
          <p className="text-lg font-bold text-accent">{streak}</p>
          <p className="text-xs text-muted-foreground">Seri</p>
        </div>
        {globalPct !== null && (
          <div>
            <p className="text-lg font-bold text-foreground">%{globalPct}</p>
            <p className="text-xs text-muted-foreground">Genel doğruluk</p>
          </div>
        )}
      </div>

      {!round ? (
        <Card className="p-8 text-center text-sm text-muted-foreground">
          Oynanacak yorum kalmadı. Daha sonra tekrar dene.
        </Card>
      ) : (
        <Card className="flex flex-col gap-4 p-6">
          <p className="text-xs text-muted-foreground">
            Konu: <span className="text-foreground">{round.topicTitle}</span>
          </p>
          <blockquote className="border-l-2 border-primary pl-4 text-sm leading-relaxed">
            {round.content}
          </blockquote>

          {result ? (
            <div className="flex flex-col items-center gap-3 pt-2">
              <p
                className={`text-lg font-bold ${result.correct ? "text-primary" : "text-destructive"}`}
              >
                {result.correct ? "Doğru bildin!" : "Yanlış!"}
              </p>
              <p className="text-sm text-muted-foreground text-center">
                Bu yorumu <span className="font-semibold text-foreground">{result.authorName}</span>{" "}
                yazdı — {result.isAI ? "bir yapay zeka." : "gerçek bir insan."}
              </p>
              <Button onClick={next} disabled={loading} className="glow-sm">
                {loading ? <Loader2 className="size-4 animate-spin" /> : <ArrowRight className="size-4" />}
                Sıradaki
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 pt-2">
              <Button
                variant="outline"
                size="lg"
                onClick={() => guess(true)}
                disabled={loading}
                className="h-14 border-primary/40 text-primary hover:bg-primary/10"
              >
                <Bot className="size-5" />
                AI Yazdı
              </Button>
              <Button
                variant="outline"
                size="lg"
                onClick={() => guess(false)}
                disabled={loading}
                className="h-14 border-accent/40 text-accent hover:bg-accent/10"
              >
                <User className="size-5" />
                İnsan Yazdı
              </Button>
            </div>
          )}
        </Card>
      )}
    </div>
  )
}

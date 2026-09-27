"use client"

import { useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { Swords, Loader2 } from "lucide-react"
import { startArenaDebate, type ArenaMessage } from "@/app/actions/viral"

const SUGGESTIONS = [
  "Çiğ köfteye cips banılır mı?",
  "Sabah insanı mı gece insanı mı?",
  "Pineapple pizzaya konur mu?",
  "Kedi mi köpek mi?",
  "Çay mı kahve mi?",
]

export function ArenaClient() {
  const [question, setQuestion] = useState("")
  const [messages, setMessages] = useState<ArenaMessage[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeQuestion, setActiveQuestion] = useState<string | null>(null)

  async function fight(q: string) {
    const trimmed = q.trim()
    if (trimmed.length < 5 || loading) return
    setLoading(true)
    setError(null)
    setMessages([])
    setActiveQuestion(trimmed)
    try {
      const result = await startArenaDebate(trimmed)
      setMessages(result.messages)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Bir şeyler ters gitti")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="text-center">
        <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-2xl bg-primary/15 text-primary">
          <Swords className="size-6" />
        </div>
        <h1 className="text-2xl font-bold text-balance">AI Arenası</h1>
        <p className="mt-1 text-sm text-muted-foreground text-pretty">
          Bir soru sor, iki AI kullanıcımız senin için kapışsın. Kazananı sen seç.
        </p>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault()
          fight(question)
        }}
        className="flex gap-2"
      >
        <Input
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Kapışma konusu yaz... (örn: çay mı kahve mi?)"
          maxLength={200}
          aria-label="Kapışma konusu"
        />
        <Button type="submit" disabled={loading || question.trim().length < 5} className="glow-sm">
          {loading ? <Loader2 className="size-4 animate-spin" /> : <Swords className="size-4" />}
          Kapıştır
        </Button>
      </form>

      <div className="flex flex-wrap justify-center gap-2">
        {SUGGESTIONS.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => {
              setQuestion(s)
              fight(s)
            }}
            disabled={loading}
            className="rounded-full border border-border bg-card px-3 py-1 text-xs text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground disabled:opacity-50"
          >
            {s}
          </button>
        ))}
      </div>

      {error && (
        <p role="alert" className="text-center text-sm text-destructive">
          {error}
        </p>
      )}

      {loading && (
        <Card className="flex flex-col items-center gap-3 p-8">
          <Loader2 className="size-6 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">
            {"AI'lar ısınıyor... Atışma hazırlanıyor, bu 20-30 saniye sürebilir."}
          </p>
        </Card>
      )}

      {activeQuestion && messages.length > 0 && (
        <div className="flex flex-col gap-3">
          <p className="text-center text-sm font-semibold text-primary">
            {'"'}
            {activeQuestion}
            {'"'}
          </p>
          {messages.map((m, i) => {
            const isLeft = i % 2 === 0
            return (
              <div
                key={i}
                className={`flex max-w-[85%] items-start gap-2 ${isLeft ? "self-start" : "flex-row-reverse self-end"}`}
              >
                {m.avatarUrl ? (
                  <Image
                    src={m.avatarUrl || "/placeholder.svg"}
                    alt={m.speaker}
                    width={32}
                    height={32}
                    className="mt-1 size-8 shrink-0 rounded-full object-cover"
                  />
                ) : (
                  <div className="mt-1 size-8 shrink-0 rounded-full bg-secondary" />
                )}
                <div
                  className={`rounded-2xl border px-4 py-2.5 text-sm leading-relaxed ${
                    isLeft
                      ? "rounded-tl-sm border-border bg-card"
                      : "rounded-tr-sm border-primary/30 bg-primary/10"
                  }`}
                >
                  <Link
                    href={`/profil/${m.username}`}
                    className="mb-0.5 block text-xs font-bold text-primary hover:underline"
                  >
                    {m.speaker}
                  </Link>
                  {m.text}
                </div>
              </div>
            )
          })}
          <p className="mt-2 text-center text-xs text-muted-foreground">
            Kapışma bitti. Kazanan kim sence? Yeni bir soruyla tekrar dene.
          </p>
        </div>
      )}
    </div>
  )
}

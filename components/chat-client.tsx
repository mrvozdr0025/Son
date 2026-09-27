"use client"

import { useRef, useState } from "react"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Flame, Loader2, MessageCircle, Send } from "lucide-react"
import { chatWithPersona, type ChatTurn } from "@/app/actions/viral"

type Persona = { username: string; displayName: string; avatarUrl: string | null }

export function ChatClient({ personas }: { personas: Persona[] }) {
  const [selected, setSelected] = useState<Persona | null>(personas[0] ?? null)
  const [history, setHistory] = useState<ChatTurn[]>([])
  const [input, setInput] = useState("")
  const [roast, setRoast] = useState(false)
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  function selectPersona(p: Persona) {
    setSelected(p)
    setHistory([])
  }

  async function send(e?: React.FormEvent) {
    e?.preventDefault()
    const msg = input.trim()
    if (!msg || !selected || loading) return
    setInput("")
    const newHistory: ChatTurn[] = [...history, { role: "user", text: msg }]
    setHistory(newHistory)
    setLoading(true)
    try {
      const reply = await chatWithPersona(selected.username, history, msg, roast)
      setHistory([...newHistory, { role: "ai", text: reply }])
    } catch {
      setHistory([...newHistory, { role: "ai", text: "bi saniye kafam karıştı, tekrar yazar mısın" }])
    } finally {
      setLoading(false)
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="text-center">
        <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-2xl bg-primary/15 text-primary">
          <MessageCircle className="size-6" />
        </div>
        <h1 className="text-2xl font-bold text-balance">AI ile Sohbet</h1>
        <p className="mt-1 text-sm text-muted-foreground text-pretty">
          Forumun ünlü AI karakterlerinden birini seç ve sohbete başla.
        </p>
      </div>

      <div className="flex flex-wrap justify-center gap-2">
        {personas.map((p) => (
          <button
            key={p.username}
            type="button"
            onClick={() => selectPersona(p)}
            className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs transition-colors ${
              selected?.username === p.username
                ? "border-primary bg-primary/15 text-primary"
                : "border-border bg-card text-muted-foreground hover:text-foreground"
            }`}
          >
            {p.avatarUrl && (
              <Image
                src={p.avatarUrl || "/placeholder.svg"}
                alt=""
                width={20}
                height={20}
                className="size-5 rounded-full object-cover"
              />
            )}
            {p.displayName}
          </button>
        ))}
      </div>

      <div className="flex items-center justify-center gap-2">
        <Switch id="roast" checked={roast} onCheckedChange={setRoast} />
        <Label htmlFor="roast" className="flex items-center gap-1.5 text-sm">
          <Flame className={`size-4 ${roast ? "text-destructive" : "text-muted-foreground"}`} />
          Roast Modu {roast ? "(hazır ol)" : ""}
        </Label>
      </div>

      <Card className="flex min-h-80 flex-col gap-3 p-4">
        {history.length === 0 && (
          <p className="m-auto text-sm text-muted-foreground text-center text-pretty">
            {selected
              ? `${selected.displayName} seni bekliyor. ${roast ? "Roast modu açık, ilk lafı sen at." : "Bir şeyler yaz."}`
              : "Önce bir karakter seç."}
          </p>
        )}
        {history.map((t, i) => (
          <div
            key={i}
            className={`max-w-[80%] rounded-2xl border px-4 py-2.5 text-sm leading-relaxed ${
              t.role === "user"
                ? "self-end rounded-tr-sm border-primary/30 bg-primary/10"
                : "self-start rounded-tl-sm border-border bg-secondary"
            }`}
          >
            {t.text}
          </div>
        ))}
        {loading && (
          <div className="flex items-center gap-2 self-start text-xs text-muted-foreground">
            <Loader2 className="size-3 animate-spin" />
            {selected?.displayName} yazıyor...
          </div>
        )}
        <div ref={bottomRef} />
      </Card>

      <form onSubmit={send} className="flex gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={roast ? "Cesaretin varsa yaz..." : "Mesajını yaz..."}
          maxLength={1000}
          aria-label="Mesaj"
        />
        <Button type="submit" disabled={loading || !input.trim()} className="glow-sm">
          <Send className="size-4" />
          <span className="sr-only">Gönder</span>
        </Button>
      </form>
    </div>
  )
}

"use client"

import { useState, useTransition } from "react"
import Link from "next/link"
import Image from "next/image"
import { Card } from "@/components/ui/card"
import { Button, buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { Switch } from "@/components/ui/switch"
import { Loader2, Sparkles, MessageSquarePlus, FileText, Pencil, UserPlus, KeyRound } from "lucide-react"
import {
  togglePersona,
  triggerAIBatch,
  triggerDailyTopic,
  triggerDailySummary,
} from "@/app/actions/admin"
import { timeAgo } from "@/lib/format"
import { PersonaEditor, type PersonaFormData } from "@/components/admin/persona-editor"

type Persona = {
  id: number
  isActive: boolean
  opinionStyle: string
  systemPrompt: string
  writingStyle: string
  interests: string[]
  activeHourStart: number
  activeHourEnd: number
  typoRate: number
  emojiStyle: string
  displayName: string
  username: string
  avatarUrl: string | null
  bio: string | null
  karma: number
}

type LogRow = {
  id: number
  action: string
  detail: string | null
  createdAt: Date
  displayName: string
}

const ACTION_LABELS: Record<string, string> = {
  topic: "konu açtı",
  comment: "yorum yaptı",
  vote: "oy verdi",
  summary: "özet yazdı",
}

export function AIControlPanel({ personas, log }: { personas: Persona[]; log: LogRow[] }) {
  const [pending, startTransition] = useTransition()
  const [message, setMessage] = useState<string | null>(null)
  const [editorOpen, setEditorOpen] = useState(false)
  const [editingPersona, setEditingPersona] = useState<PersonaFormData | null>(null)

  function openCreate() {
    setEditingPersona(null)
    setEditorOpen(true)
  }

  function openEdit(p: Persona) {
    setEditingPersona({
      id: p.id,
      displayName: p.displayName,
      username: p.username,
      bio: p.bio,
      avatarUrl: p.avatarUrl,
      systemPrompt: p.systemPrompt,
      writingStyle: p.writingStyle,
      opinionStyle: p.opinionStyle,
      emojiStyle: p.emojiStyle,
      interests: p.interests,
      activeHourStart: p.activeHourStart,
      activeHourEnd: p.activeHourEnd,
      typoRate: p.typoRate,
    })
    setEditorOpen(true)
  }

  function run(fn: () => Promise<unknown>, label: string) {
    setMessage(null)
    startTransition(async () => {
      try {
        await fn()
        setMessage(`${label} tamamlandı.`)
      } catch (e) {
        setMessage(e instanceof Error ? e.message : "Hata oluştu")
      }
    })
  }

  return (
    <div className="flex flex-col gap-6">
      <Card className="flex flex-col gap-3 p-4">
        <h2 className="text-sm font-semibold">Manuel Tetikleyiciler</h2>
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            disabled={pending}
            onClick={() => run(triggerAIBatch, "AI aktivite turu")}
          >
            {pending ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
            Aktivite Turu Çalıştır
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={pending}
            onClick={() => run(triggerDailyTopic, "Günün konusu")}
          >
            <MessageSquarePlus className="size-4" />
            Günün Konusunu Aç
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={pending}
            onClick={() => run(triggerDailySummary, "Günlük özet")}
          >
            <FileText className="size-4" />
            Günlük Özet Yaz
          </Button>
          <Link
            href="/admin/api"
            className={cn(
              buttonVariants({ variant: "secondary", size: "sm" }),
              "ml-auto gap-1.5 border border-primary/20 bg-primary/10 text-primary hover:bg-primary/20"
            )}
          >
            <KeyRound className="size-4" />
            Modeli Değiştir & API&apos;yi Test Et
          </Link>
        </div>
        {message && <p className="text-xs text-muted-foreground">{message}</p>}
        <p className="text-xs text-muted-foreground">
          Not: Bu işlemler Gemini çağrısı yapar, 10-30 saniye sürebilir. Otomatik çalışma cron ile
          saatlik/günlük yapılır.
        </p>
      </Card>

      <Card className="p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold">AI Kullanıcılar ({personas.length})</h2>
          <Button size="sm" variant="outline" onClick={openCreate}>
            <UserPlus className="size-4" />
            Yeni AI Kullanıcı
          </Button>
        </div>
        <ul className="flex flex-col divide-y divide-border">
          {personas.map((p) => (
            <li key={p.id} className="flex items-center gap-3 py-2.5">
              {p.avatarUrl ? (
                <Image
                  src={p.avatarUrl || "/placeholder.svg"}
                  alt=""
                  width={36}
                  height={36}
                  className="size-9 rounded-full object-cover"
                />
              ) : (
                <div className="size-9 rounded-full bg-secondary" />
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{p.displayName}</p>
                <p className="truncate text-xs text-muted-foreground">
                  @{p.username} · {p.opinionStyle} · {p.karma} karma
                </p>
              </div>
              <Button
                size="icon-sm"
                variant="ghost"
                onClick={() => openEdit(p)}
                aria-label={`${p.displayName} düzenle`}
              >
                <Pencil className="size-4" />
              </Button>
              <Switch
                checked={p.isActive}
                onCheckedChange={(v) => startTransition(() => togglePersona(p.id, v))}
                aria-label={`${p.displayName} aktif/pasif`}
              />
            </li>
          ))}
        </ul>
      </Card>

      <PersonaEditor open={editorOpen} onOpenChange={setEditorOpen} persona={editingPersona} />

      <Card className="p-4">
        <h2 className="mb-3 text-sm font-semibold">Son AI Aktiviteleri</h2>
        {log.length === 0 ? (
          <p className="text-sm text-muted-foreground">Henüz aktivite yok.</p>
        ) : (
          <ul className="flex flex-col gap-2 text-sm">
            {log.map((row) => (
              <li key={row.id} className="flex items-baseline gap-2">
                <span className="shrink-0 text-xs text-muted-foreground">
                  {timeAgo(row.createdAt)}
                </span>
                <span>
                  <span className="font-medium">{row.displayName}</span>{" "}
                  <span className="text-muted-foreground">
                    {ACTION_LABELS[row.action] ?? row.action}
                    {row.detail ? ` — ${row.detail}` : ""}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  )
}

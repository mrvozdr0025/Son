"use client"

import { useState } from "react"
import {
  Bell,
  MessageSquare,
  MessageCircle,
  AtSign,
  Heart,
  Award,
  UserPlus,
  Check,
  Loader2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import type { NotificationPreferences } from "@/lib/db/schema"
import { updateNotificationPreferences } from "@/app/actions/notification-settings"

interface Props {
  initialPreferences: NotificationPreferences
}

export function NotificationPreferencesForm({ initialPreferences }: Props) {
  const [prefs, setPrefs] = useState<NotificationPreferences>(initialPreferences)
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const toggle = (key: keyof NotificationPreferences) => {
    setPrefs((prev) => ({ ...prev, [key]: !prev[key] }))
    setSaved(false)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const res = await updateNotificationPreferences(prefs)
    setLoading(false)

    if (res.success) {
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } else {
      setError(res.error || "Tercihler kaydedilirken hata oluştu.")
    }
  }

  const items: {
    key: keyof NotificationPreferences
    title: string
    description: string
    icon: typeof Bell
  }[] = [
    {
      key: "topicReply",
      title: "Konunuza Yeni Yanıt",
      description: "Açtığınız bir foruma veya tartışmaya yeni yorum eklendiğinde",
      icon: MessageSquare,
    },
    {
      key: "commentReply",
      title: "Yorumunuza Cevap",
      description: "Yazdığınız bir yoruma doğrudan bir yanıt verildiğinde",
      icon: MessageCircle,
    },
    {
      key: "mention",
      title: "Bahsetmeler (@kullanıcı)",
      description: "Bir başlıkta veya yorumda @kullanıcıAdınız etiketlendiğinde",
      icon: AtSign,
    },
    {
      key: "reaction",
      title: "Tepkiler ve Beğeniler",
      description: "Yorumlarınıza veya konularınıza emoji tepkisi verildiğinde",
      icon: Heart,
    },
    {
      key: "badge",
      title: "Rozet & Başarılar",
      description: "Yeni bir rozet kazandığınızda veya seviye atladığınızda",
      icon: Award,
    },
    {
      key: "follow",
      title: "Yeni Takipçiler",
      description: "Sizi yeni bir forum üyesi takip etmeye başladığında",
      icon: UserPlus,
    },
  ]

  return (
    <form onSubmit={handleSave} className="space-y-6">
      {error && (
        <div className="p-3.5 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive text-sm">
          {error}
        </div>
      )}

      {saved && (
        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-sm flex items-center gap-2">
          <Check className="size-4" />
          Bildirim tercihleriniz başarıyla güncellendi.
        </div>
      )}

      <div className="divide-y divide-border/60 rounded-2xl border border-border/80 bg-card/60 backdrop-blur-sm overflow-hidden">
        {items.map((item) => {
          const Icon = item.icon
          const isChecked = Boolean(prefs[item.key])
          return (
            <div
              key={String(item.key)}
              className="flex items-center justify-between p-4 sm:p-5 hover:bg-muted/30 transition-colors"
            >
              <div className="flex items-start gap-3.5 min-w-0 pr-4">
                <div className="mt-0.5 p-2 rounded-xl bg-muted border border-border/70 text-foreground shrink-0">
                  <Icon className="size-4 text-primary" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-foreground">{item.title}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">{item.description}</p>
                </div>
              </div>
              <Switch
                checked={isChecked}
                onCheckedChange={() => toggle(item.key)}
                className="shrink-0"
              />
            </div>
          )
        })}
      </div>

      <div className="flex items-center justify-end gap-3 pt-2">
        <Button type="submit" disabled={loading} className="gap-2 glow-sm">
          {loading ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Kaydediliyor...
            </>
          ) : (
            <>
              <Check className="size-4" />
              Tercihleri Kaydet
            </>
          )}
        </Button>
      </div>
    </form>
  )
}

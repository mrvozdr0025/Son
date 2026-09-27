"use client"

import { useState, useTransition } from "react"
import {
  AlertCircle,
  AlertTriangle,
  Bell,
  CheckCircle2,
  ExternalLink,
  Info,
  Plus,
  Sparkles,
  Trash2,
  X,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import {
  createAnnouncement,
  deleteAnnouncement,
  getAnnouncements,
  toggleAnnouncement,
} from "@/app/actions/moderation"
import { timeAgo } from "@/lib/format"

interface AnnouncementItem {
  id: number
  title: string
  message: string
  linkUrl: string | null
  linkText: string | null
  bannerType: string
  isActive: boolean
  createdAt: Date
}

interface Props {
  initialAnnouncements: AnnouncementItem[]
}

export function AnnouncementAdmin({ initialAnnouncements }: Props) {
  const [list, setList] = useState<AnnouncementItem[]>(initialAnnouncements)
  const [modalOpen, setModalOpen] = useState(false)
  const [pending, startTransition] = useTransition()

  const [title, setTitle] = useState("")
  const [message, setMessage] = useState("")
  const [linkUrl, setLinkUrl] = useState("")
  const [linkText, setLinkText] = useState("")
  const [bannerType, setBannerType] = useState<"info" | "warning" | "critical" | "event">("info")
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim() || !message.trim()) return

    const formData = new FormData()
    formData.append("title", title.trim())
    formData.append("message", message.trim())
    if (linkUrl.trim()) formData.append("linkUrl", linkUrl.trim())
    if (linkText.trim()) formData.append("linkText", linkText.trim())
    formData.append("bannerType", bannerType)

    startTransition(async () => {
      await createAnnouncement(formData)
      const refreshed = await getAnnouncements()
      setList(refreshed)
      setModalOpen(false)
      setTitle("")
      setMessage("")
      setLinkUrl("")
      setLinkText("")
      setSuccessMsg("Duyuru başarıyla yayınlandı ve sitenin tepesinde aktif edildi.")
      setTimeout(() => setSuccessMsg(null), 3500)
    })
  }

  const handleToggle = (id: number, current: boolean) => {
    startTransition(async () => {
      await toggleAnnouncement(id, !current)
      setList((prev) =>
        prev.map((item) => (item.id === id ? { ...item, isActive: !current } : item))
      )
    })
  }

  const handleDelete = (id: number) => {
    if (!confirm("Bu duyuruyu silmek istediğinize emin misiniz?")) return
    startTransition(async () => {
      await deleteAnnouncement(id)
      setList((prev) => prev.filter((item) => item.id !== id))
    })
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 border-b border-border/60 pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
            Önemli Duyuru Banner&apos;ı Yönetimi
          </h1>
          <p className="text-xs text-muted-foreground sm:text-sm">
            Sitenin en üstünde tüm kullanıcılara görünecek acil veya süreli duyuru/etkinlik çubuğu ekleyin.
          </p>
        </div>

        <Button onClick={() => setModalOpen(true)} size="sm" className="text-xs">
          <Plus className="size-3.5 mr-1" />
          Yeni Duyuru Ekle
        </Button>
      </div>

      {successMsg && (
        <div className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-300">
          <CheckCircle2 className="size-4" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Announcements Table */}
      <div className="overflow-x-auto rounded-lg border border-border/70 bg-card">
        <table className="w-full text-left text-xs">
          <thead className="border-b border-border/80 bg-muted/40 text-muted-foreground">
            <tr>
              <th className="p-3">Başlık</th>
              <th className="p-3">Mesaj</th>
              <th className="p-3">Tür</th>
              <th className="p-3">Bağlantı</th>
              <th className="p-3 text-center">Aktif</th>
              <th className="p-3">Oluşturulma</th>
              <th className="p-3 text-right">İşlem</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/50">
            {list.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-8 text-center text-muted-foreground">
                  Kayıtlı duyuru bulunmuyor. Yeni bir banner oluşturarak yayına alabilirsiniz.
                </td>
              </tr>
            ) : (
              list.map((a) => (
                <tr key={a.id} className="hover:bg-muted/30 transition">
                  <td className="p-3 font-semibold text-foreground max-w-xs truncate">
                    {a.title}
                  </td>
                  <td className="p-3 text-muted-foreground max-w-sm truncate">
                    {a.message}
                  </td>
                  <td className="p-3">
                    <Badge
                      variant="outline"
                      className={
                        a.bannerType === "critical"
                          ? "border-red-500/40 text-red-300 bg-red-500/10 text-[10px]"
                          : a.bannerType === "warning"
                          ? "border-amber-500/40 text-amber-300 bg-amber-500/10 text-[10px]"
                          : a.bannerType === "event"
                          ? "border-purple-500/40 text-purple-300 bg-purple-500/10 text-[10px]"
                          : "border-cyan-500/40 text-cyan-300 bg-cyan-500/10 text-[10px]"
                      }
                    >
                      {a.bannerType === "critical"
                        ? "Acil / Kritik"
                        : a.bannerType === "warning"
                        ? "Uyarı"
                        : a.bannerType === "event"
                        ? "Etkinlik"
                        : "Bilgi"}
                    </Badge>
                  </td>
                  <td className="p-3 text-muted-foreground">
                    {a.linkUrl ? (
                      <a
                        href={a.linkUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-primary hover:underline flex items-center gap-1"
                      >
                        <span>{a.linkText || "Link"}</span>
                        <ExternalLink className="size-3 inline" />
                      </a>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="p-3 text-center">
                    <Switch
                      checked={a.isActive}
                      onCheckedChange={() => handleToggle(a.id, a.isActive)}
                    />
                  </td>
                  <td className="p-3 text-muted-foreground">
                    {timeAgo(a.createdAt)}
                  </td>
                  <td className="p-3 text-right">
                    <button
                      onClick={() => handleDelete(a.id)}
                      className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition"
                      title="Sil"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal for New Announcement */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-xl border border-border bg-card p-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-border/80 pb-3">
              <h3 className="text-base font-semibold text-foreground">Yeni Duyuru Banner&apos;ı</h3>
              <button onClick={() => setModalOpen(false)} className="rounded p-1 text-muted-foreground hover:bg-muted">
                <X className="size-4" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="mt-4 flex flex-col gap-3">
              <div>
                <label className="text-xs font-semibold text-foreground">Başlık (Kısa Vurgu)</label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Örn: Sunucu Bakımı, Büyük Çekiliş, v2 Güncellemesi"
                  required
                  className="mt-1 text-xs"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-foreground">Mesaj Metni</label>
                <Textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Örn: 25 Ekim saat 03:00'da planlı sistem güncellemesi yapılacaktır."
                  required
                  rows={3}
                  className="mt-1 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-foreground">Banner Türü</label>
                  <select
                    value={bannerType}
                    onChange={(e) => setBannerType(e.target.value as any)}
                    className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-xs"
                  >
                    <option value="info">Bilgi (Mavi/Cyan)</option>
                    <option value="warning">Uyarı (Turuncu/Amber)</option>
                    <option value="critical">Acil / Kritik (Kırmızı Yanıp Sönen)</option>
                    <option value="event">Etkinlik (Neon Mor)</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-foreground">Buton Metni (Opsiyonel)</label>
                  <Input
                    value={linkText}
                    onChange={(e) => setLinkText(e.target.value)}
                    placeholder="Detaylar / Katıl"
                    className="mt-1 text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-foreground">Yönlendirme Linki (Opsiyonel)</label>
                <Input
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  placeholder="https://... veya /konu/..."
                  className="mt-1 text-xs"
                />
              </div>

              <div className="mt-4 flex justify-end gap-2 border-t border-border/80 pt-3">
                <Button size="sm" type="button" variant="outline" onClick={() => setModalOpen(false)}>
                  İptal
                </Button>
                <Button size="sm" type="submit" disabled={pending}>
                  Yayınla ve Aktif Et
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

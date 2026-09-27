"use client"

import { useState, useTransition } from "react"
import {
  Calendar,
  CheckCircle2,
  Clock,
  Eye,
  FileEdit,
  Mail,
  Plus,
  Send,
  Trash2,
  Users,
  X,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  createNewsletter,
  deleteNewsletter,
  getNewsletters,
  sendNewsletter,
  updateNewsletter,
} from "@/app/actions/moderation"
import { timeAgo } from "@/lib/format"

interface Props {
  initialNewsletters: Array<{
    id: number
    title: string
    content: string
    status: string
    sentAt: Date | null
    recipientCount: number
    createdAt: Date
    updatedAt: Date
  }>
  stats: {
    subscribersCount: number
    sentNewslettersCount: number
  }
}

export function NewsletterAdmin({ initialNewsletters, stats }: Props) {
  const [newslettersList, setNewslettersList] = useState(initialNewsletters)
  const [subscribersCount] = useState(stats.subscribersCount)
  const [sentCount, setSentCount] = useState(stats.sentNewslettersCount)
  const [pending, startTransition] = useTransition()

  // Editor modal state
  const [editorOpen, setEditorOpen] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [title, setTitle] = useState("")
  const [content, setContent] = useState("")
  const [previewTab, setPreviewTab] = useState<"edit" | "preview">("edit")
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const openNewEditor = () => {
    setEditingId(null)
    setTitle("")
    setContent(
      `Merhaba neonsform topluluğu! 👋\n\nBu haftaki bültenimizde öne çıkan tartışmalar, teknoloji dünyasındaki gelişmeler ve topluluk duyurularımız yer alıyor.\n\n### 🚀 Haftanın En Popüler Konuları\n- **Konu 1:** Detaylar ve tartışma özeti...\n- **Konu 2:** Topluluğun en çok oy alan fikri...\n\n### 💡 Moderatör Köşesi\nKurallarımıza ve saygılı tartışma kültürümüze katkı sağlayan herkese teşekkür ederiz.\n\nİyi forumlar!`
    )
    setPreviewTab("edit")
    setEditorOpen(true)
  }

  const openEdit = (n: (typeof newslettersList)[0]) => {
    setEditingId(n.id)
    setTitle(n.title)
    setContent(n.content)
    setPreviewTab("edit")
    setEditorOpen(true)
  }

  const handleSaveDraft = () => {
    if (!title.trim() || !content.trim()) return
    startTransition(async () => {
      if (editingId) {
        await updateNewsletter(editingId, title, content)
      } else {
        await createNewsletter(title, content)
      }
      const refreshed = await getNewsletters()
      setNewslettersList(refreshed)
      setEditorOpen(false)
      setSuccessMessage("Bülten taslağı başarıyla kaydedildi.")
      setTimeout(() => setSuccessMessage(null), 3000)
    })
  }

  const handleSend = (id: number) => {
    if (!confirm("Bu bülteni tüm kayıtlı abonelere göndermek istediğinize emin misiniz?")) {
      return
    }
    startTransition(async () => {
      const res = await sendNewsletter(id)
      const refreshed = await getNewsletters()
      setNewslettersList(refreshed)
      setSentCount((prev) => prev + 1)
      setSuccessMessage(`Bülten ${res.recipientCount} aboneye başarıyla gönderildi!`)
      setTimeout(() => setSuccessMessage(null), 4000)
    })
  }

  const handleDelete = (id: number) => {
    if (!confirm("Bu bülteni silmek istediğinize emin misiniz?")) return
    startTransition(async () => {
      await deleteNewsletter(id)
      setNewslettersList((prev) => prev.filter((item) => item.id !== id))
    })
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Top Banner & Header */}
      <div className="flex flex-col gap-4 border-b border-border/60 pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
            Bülten Editörü & Gönderim Yönetimi
          </h1>
          <p className="text-xs text-muted-foreground sm:text-sm">
            Topluluk bültenleri hazırlayın, taslak olarak saklayın ve tüm e-posta abonelerinize toplu gönderim yapın.
          </p>
        </div>

        <Button onClick={openNewEditor} size="sm" className="text-xs">
          <Plus className="size-3.5 mr-1" />
          Yeni Bülten Oluştur
        </Button>
      </div>

      {successMessage && (
        <div className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-300">
          <CheckCircle2 className="size-4" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="flex items-center gap-3.5 p-4 border-border/70">
          <div className="rounded-lg bg-primary/10 p-2.5 text-primary">
            <Users className="size-5" />
          </div>
          <div>
            <div className="text-xl font-bold text-foreground">{subscribersCount}</div>
            <div className="text-xs text-muted-foreground">Aktif E-posta Abonesi</div>
          </div>
        </Card>

        <Card className="flex items-center gap-3.5 p-4 border-border/70">
          <div className="rounded-lg bg-emerald-500/10 p-2.5 text-emerald-400">
            <Send className="size-5" />
          </div>
          <div>
            <div className="text-xl font-bold text-foreground">{sentCount}</div>
            <div className="text-xs text-muted-foreground">Toplam Gönderilen Bülten</div>
          </div>
        </Card>

        <Card className="flex items-center gap-3.5 p-4 border-border/70">
          <div className="rounded-lg bg-purple-500/10 p-2.5 text-purple-400">
            <FileEdit className="size-5" />
          </div>
          <div>
            <div className="text-xl font-bold text-foreground">
              {newslettersList.filter((n) => n.status === "draft").length}
            </div>
            <div className="text-xs text-muted-foreground">Taslak Bülten</div>
          </div>
        </Card>
      </div>

      {/* Newsletters Table */}
      <div className="overflow-x-auto rounded-lg border border-border/70 bg-card">
        <table className="w-full text-left text-xs">
          <thead className="border-b border-border/80 bg-muted/40 text-muted-foreground">
            <tr>
              <th className="p-3">Bülten Başlığı</th>
              <th className="p-3">Durum</th>
              <th className="p-3">Alıcı Sayısı</th>
              <th className="p-3">Gönderim Tarihi</th>
              <th className="p-3">Oluşturulma</th>
              <th className="p-3 text-right">İşlemler</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/50">
            {newslettersList.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-8 text-center text-muted-foreground">
                  Henüz oluşturulmuş bir bülten bulunmuyor. Yeni bir bülten oluşturabilirsiniz.
                </td>
              </tr>
            ) : (
              newslettersList.map((n) => (
                <tr key={n.id} className="hover:bg-muted/30 transition">
                  <td className="p-3 font-medium text-foreground max-w-sm truncate">
                    {n.title}
                  </td>
                  <td className="p-3">
                    <Badge
                      variant={n.status === "sent" ? "secondary" : "outline"}
                      className={
                        n.status === "sent"
                          ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30 text-[10px]"
                          : "text-amber-400 border-amber-500/30 text-[10px]"
                      }
                    >
                      {n.status === "sent" ? "Gönderildi" : "Taslak"}
                    </Badge>
                  </td>
                  <td className="p-3 font-mono text-muted-foreground">
                    {n.status === "sent" ? `${n.recipientCount} kişi` : "—"}
                  </td>
                  <td className="p-3 text-muted-foreground">
                    {n.sentAt ? timeAgo(n.sentAt) : "—"}
                  </td>
                  <td className="p-3 text-muted-foreground">
                    {timeAgo(n.createdAt)}
                  </td>
                  <td className="p-3 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => openEdit(n)}
                        className="h-7 px-2 text-xs"
                      >
                        <FileEdit className="size-3.5 mr-1" />
                        {n.status === "sent" ? "İncele" : "Düzenle"}
                      </Button>

                      {n.status === "draft" && (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={pending}
                          onClick={() => handleSend(n.id)}
                          className="h-7 px-2 text-xs text-primary hover:text-primary"
                        >
                          <Send className="size-3.5 mr-1" />
                          Gönder
                        </Button>
                      )}

                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDelete(n.id)}
                        className="h-7 px-2 text-xs text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Editor Modal */}
      {editorOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-sm p-4">
          <div className="w-full max-w-2xl rounded-xl border border-border bg-card p-5 shadow-2xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-border/80 pb-3">
              <h3 className="text-base font-semibold text-foreground">
                {editingId ? "Bülteni Düzenle" : "Yeni Bülten Hazırla"}
              </h3>
              <button
                onClick={() => setEditorOpen(false)}
                className="rounded p-1 text-muted-foreground hover:bg-muted"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="mt-4 flex-1 flex flex-col gap-3 overflow-y-auto">
              <div>
                <label className="text-xs font-semibold text-foreground">Bülten Konusu / Başlığı</label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Örn: neonsform Haftalık Bülteni #12: Yapay Zeka Tartışmaları"
                  className="mt-1 text-xs"
                />
              </div>

              {/* Editor / Preview Switcher */}
              <div className="flex items-center justify-between border-b border-border/60 pb-1">
                <label className="text-xs font-semibold text-foreground">İçerik (Markdown)</label>
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => setPreviewTab("edit")}
                    className={`rounded px-2 py-0.5 text-xs font-medium ${
                      previewTab === "edit"
                        ? "bg-muted text-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Yazım
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewTab("preview")}
                    className={`rounded px-2 py-0.5 text-xs font-medium ${
                      previewTab === "preview"
                        ? "bg-muted text-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Önizleme
                  </button>
                </div>
              </div>

              {previewTab === "edit" ? (
                <Textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Bülten metnini Markdown formatında buraya yazın..."
                  rows={14}
                  className="font-mono text-xs leading-relaxed"
                />
              ) : (
                <div className="max-h-72 overflow-y-auto rounded-md border border-border/70 bg-background/60 p-4 text-xs prose prose-invert prose-xs max-w-none">
                  <div className="whitespace-pre-wrap">{content}</div>
                </div>
              )}
            </div>

            <div className="mt-4 flex justify-end gap-2 border-t border-border/80 pt-3">
              <Button size="sm" variant="outline" onClick={() => setEditorOpen(false)}>
                Vazgeç
              </Button>
              <Button
                size="sm"
                disabled={pending || !title.trim() || !content.trim()}
                onClick={handleSaveDraft}
              >
                Taslağı Kaydet
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

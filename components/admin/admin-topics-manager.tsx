"use client"

import { useState, useTransition } from "react"
import Link from "next/link"
import { bulkUpdateTopics, type BulkTopicItem } from "@/app/actions/moderation"
import { Card } from "@/components/ui/card"
import { Button, buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { timeAgo } from "@/lib/format"
import {
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  Flame,
  FolderSync,
  Lock,
  MessageSquare,
  Pin,
  RefreshCw,
  Search,
  Trash2,
  Unlock,
  SlidersHorizontal,
} from "lucide-react"

interface AdminTopicsManagerProps {
  initialTopics: BulkTopicItem[]
  categories: Array<{ id: number; name: string }>
}

export function AdminTopicsManager({ initialTopics, categories }: AdminTopicsManagerProps) {
  const [topics, setTopics] = useState<BulkTopicItem[]>(initialTopics)
  const [selectedIds, setSelectedIds] = useState<number[]>([])
  const [search, setSearch] = useState("")
  const [categoryFilter, setCategoryFilter] = useState<string>("all")
  const [statusFilter, setStatusFilter] = useState<"all" | "pinned" | "locked" | "hot">("all")
  const [targetCategory, setTargetCategory] = useState<number>(categories[0]?.id ?? 1)
  const [isPending, startTransition] = useTransition()
  const [feedback, setFeedback] = useState<{ message: string; ok: boolean } | null>(null)

  // Filter topics
  const filteredTopics = topics.filter((t) => {
    const term = search.toLowerCase().trim()
    const matchesSearch =
      !term ||
      t.title.toLowerCase().includes(term) ||
      t.slug.toLowerCase().includes(term) ||
      t.authorName.toLowerCase().includes(term) ||
      t.authorUsername.toLowerCase().includes(term)

    const matchesCategory =
      categoryFilter === "all" || t.categoryId === Number(categoryFilter)

    let matchesStatus = true
    if (statusFilter === "pinned") matchesStatus = t.isPinned
    else if (statusFilter === "locked") matchesStatus = t.isLocked
    else if (statusFilter === "hot") matchesStatus = t.isHot

    return matchesSearch && matchesCategory && matchesStatus
  })

  const allFilteredSelected =
    filteredTopics.length > 0 &&
    filteredTopics.every((t) => selectedIds.includes(t.id))

  const toggleSelectAll = () => {
    if (allFilteredSelected) {
      setSelectedIds([])
    } else {
      setSelectedIds(filteredTopics.map((t) => t.id))
    }
  }

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    )
  }

  const handleBulkAction = (
    action: "lock" | "unlock" | "pin" | "unpin" | "hot" | "unhot" | "delete" | "change_category"
  ) => {
    if (selectedIds.length === 0) return

    if (action === "delete") {
      const confirmDelete = window.confirm(
        `Seçili ${selectedIds.length} konuyu ve ilişkili tüm içerikleri kalıcı olarak silmek istediğinize emin misiniz?`
      )
      if (!confirmDelete) return
    }

    startTransition(async () => {
      try {
        await bulkUpdateTopics(
          selectedIds,
          action,
          action === "change_category" ? targetCategory : undefined
        )

        // Optimistically update local state
        setTopics((prev) => {
          if (action === "delete") {
            return prev.filter((t) => !selectedIds.includes(t.id))
          }
          return prev.map((t) => {
            if (!selectedIds.includes(t.id)) return t
            if (action === "lock") return { ...t, isLocked: true }
            if (action === "unlock") return { ...t, isLocked: false }
            if (action === "pin") return { ...t, isPinned: true }
            if (action === "unpin") return { ...t, isPinned: false }
            if (action === "hot") return { ...t, isHot: true }
            if (action === "unhot") return { ...t, isHot: false }
            if (action === "change_category") {
              const catName = categories.find((c) => c.id === targetCategory)?.name ?? t.categoryName
              return { ...t, categoryId: targetCategory, categoryName: catName }
            }
            return t
          })
        })

        setSelectedIds([])
        setFeedback({
          ok: true,
          message: `İşlem başarıyla uygulandı (${selectedIds.length} konu etkilendi).`,
        })
      } catch (err: any) {
        setFeedback({
          ok: false,
          message: err?.message || "İşlem sırasında bir hata oluştu.",
        })
      }
    })
  }

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
            Konu Yönetimi & Moderasyon
            <Badge variant="outline" className="font-mono text-xs">
              {topics.length} Konu
            </Badge>
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Forumdaki tüm başlıkları listeleyin, sabitleyin, kilitleyin veya toplu işlem uygulayın.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => window.location.reload()}
          className="self-start text-xs gap-1.5"
        >
          <RefreshCw className="size-3.5" />
          Yenile
        </Button>
      </div>

      {feedback && (
        <div
          className={`flex items-center gap-2 p-3 rounded-lg text-xs font-medium border ${
            feedback.ok
              ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400"
              : "border-destructive/40 bg-destructive/10 text-destructive"
          }`}
        >
          {feedback.ok ? (
            <CheckCircle2 className="size-4 shrink-0" />
          ) : (
            <AlertCircle className="size-4 shrink-0" />
          )}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Filters bar */}
      <Card className="p-4 bg-card/60 border-border/80">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Başlık veya yazar ara..."
              className="pl-8 h-9 text-xs"
            />
          </div>

          <div>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <option value="all">Tüm Kategoriler</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <option value="all">Tüm Durumlar</option>
              <option value="pinned">Yalnızca Sabitlenmiş</option>
              <option value="locked">Yalnızca Kilitli</option>
              <option value="hot">Yalnızca Sıcak Konular</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Bulk action toolbar */}
      {selectedIds.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-primary/40 bg-primary/10 p-3 text-xs animate-in fade-in">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-primary">
              {selectedIds.length} konu seçildi:
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <Button
              variant="outline"
              size="sm"
              disabled={isPending}
              onClick={() => handleBulkAction("pin")}
              className="h-7 px-2 text-xs gap-1 bg-background"
            >
              <Pin className="size-3" /> Sabitle
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={isPending}
              onClick={() => handleBulkAction("unpin")}
              className="h-7 px-2 text-xs gap-1 bg-background"
            >
              Sabitlemeyi Kaldır
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={isPending}
              onClick={() => handleBulkAction("lock")}
              className="h-7 px-2 text-xs gap-1 bg-background"
            >
              <Lock className="size-3" /> Kilitle
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={isPending}
              onClick={() => handleBulkAction("unlock")}
              className="h-7 px-2 text-xs gap-1 bg-background"
            >
              <Unlock className="size-3" /> Kilidi Aç
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={isPending}
              onClick={() => handleBulkAction("hot")}
              className="h-7 px-2 text-xs gap-1 bg-background text-amber-400"
            >
              <Flame className="size-3" /> Sıcak Yap
            </Button>

            <div className="flex items-center gap-1 pl-2 border-l border-border/80">
              <select
                value={targetCategory}
                onChange={(e) => setTargetCategory(Number(e.target.value))}
                className="h-7 rounded border border-input bg-background px-2 text-[11px]"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              <Button
                variant="outline"
                size="sm"
                disabled={isPending}
                onClick={() => handleBulkAction("change_category")}
                className="h-7 px-2 text-xs gap-1 bg-background"
              >
                <FolderSync className="size-3" /> Taşı
              </Button>
            </div>

            <Button
              variant="destructive"
              size="sm"
              disabled={isPending}
              onClick={() => handleBulkAction("delete")}
              className="h-7 px-2 text-xs gap-1 ml-auto"
            >
              <Trash2 className="size-3" /> Sil
            </Button>
          </div>
        </div>
      )}

      {/* Topics Table */}
      <Card className="overflow-hidden border-border/80">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-border/80 bg-muted/50 text-muted-foreground uppercase text-[10px] font-mono">
              <tr>
                <th className="p-3 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={allFilteredSelected}
                    onChange={toggleSelectAll}
                    className="rounded border-border accent-primary cursor-pointer"
                  />
                </th>
                <th className="p-3">Başlık & URL</th>
                <th className="p-3">Kategori</th>
                <th className="p-3">Yazar</th>
                <th className="p-3 text-center">Yorum</th>
                <th className="p-3">Durum</th>
                <th className="p-3">Tarih</th>
                <th className="p-3 text-right">İşlem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {filteredTopics.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-muted-foreground">
                    Filtrelere uygun konu bulunamadı.
                  </td>
                </tr>
              ) : (
                filteredTopics.map((topic) => {
                  const isSelected = selectedIds.includes(topic.id)
                  return (
                    <tr
                      key={topic.id}
                      className={`hover:bg-muted/40 transition-colors ${
                        isSelected ? "bg-primary/5" : ""
                      }`}
                    >
                      <td className="p-3 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelect(topic.id)}
                          className="rounded border-border accent-primary cursor-pointer"
                        />
                      </td>

                      <td className="p-3 max-w-xs sm:max-w-md">
                        <div className="font-semibold text-foreground truncate hover:text-primary transition-colors">
                          <Link href={`/konu/${topic.slug}`} target="_blank">
                            {topic.title}
                          </Link>
                        </div>
                        <div className="text-[11px] font-mono text-muted-foreground truncate">
                          /konu/{topic.slug}
                        </div>
                      </td>

                      <td className="p-3 whitespace-nowrap">
                        <Badge variant="outline" className="text-[10px]">
                          {topic.categoryName}
                        </Badge>
                      </td>

                      <td className="p-3 whitespace-nowrap">
                        <div className="font-medium text-foreground">{topic.authorName}</div>
                        <div className="text-[10px] text-muted-foreground">@{topic.authorUsername}</div>
                      </td>

                      <td className="p-3 text-center whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 font-mono text-muted-foreground">
                          <MessageSquare className="size-3" />
                          {topic.commentCount}
                        </span>
                      </td>

                      <td className="p-3 whitespace-nowrap">
                        <div className="flex items-center gap-1">
                          {topic.isPinned && (
                            <Badge variant="outline" className="border-primary/40 text-primary text-[9px] px-1 py-0 gap-0.5">
                              <Pin className="size-2.5" /> Sabit
                            </Badge>
                          )}
                          {topic.isLocked && (
                            <Badge variant="outline" className="border-destructive/40 text-destructive text-[9px] px-1 py-0 gap-0.5">
                              <Lock className="size-2.5" /> Kilitli
                            </Badge>
                          )}
                          {topic.isHot && (
                            <Badge variant="outline" className="border-amber-500/40 text-amber-400 text-[9px] px-1 py-0 gap-0.5">
                              <Flame className="size-2.5" /> Sıcak
                            </Badge>
                          )}
                          {!topic.isPinned && !topic.isLocked && !topic.isHot && (
                            <span className="text-muted-foreground text-[11px]">Normal</span>
                          )}
                        </div>
                      </td>

                      <td className="p-3 whitespace-nowrap text-muted-foreground text-[11px]">
                        {timeAgo(topic.createdAt)}
                      </td>

                      <td className="p-3 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1">
                          <Link
                            href={`/konu/${topic.slug}`}
                            target="_blank"
                            className={cn(
                              buttonVariants({ variant: "ghost", size: "icon" }),
                              "size-7 text-muted-foreground hover:text-foreground"
                            )}
                            title="Konuyu görüntüle"
                          >
                            <ExternalLink className="size-3.5" />
                          </Link>

                          <Button
                            variant="ghost"
                            size="icon"
                            disabled={isPending}
                            onClick={() => {
                              setSelectedIds([topic.id])
                              handleBulkAction(topic.isPinned ? "unpin" : "pin")
                            }}
                            className={`size-7 ${
                              topic.isPinned ? "text-primary" : "text-muted-foreground"
                            }`}
                            title={topic.isPinned ? "Sabitlemeyi kaldır" : "Sabitle"}
                          >
                            <Pin className="size-3.5" />
                          </Button>

                          <Button
                            variant="ghost"
                            size="icon"
                            disabled={isPending}
                            onClick={() => {
                              setSelectedIds([topic.id])
                              handleBulkAction(topic.isLocked ? "unlock" : "lock")
                            }}
                            className={`size-7 ${
                              topic.isLocked ? "text-destructive" : "text-muted-foreground"
                            }`}
                            title={topic.isLocked ? "Kilidi aç" : "Kilitle"}
                          >
                            {topic.isLocked ? (
                              <Unlock className="size-3.5" />
                            ) : (
                              <Lock className="size-3.5" />
                            )}
                          </Button>

                          <Button
                            variant="ghost"
                            size="icon"
                            disabled={isPending}
                            onClick={() => {
                              setSelectedIds([topic.id])
                              handleBulkAction("delete")
                            }}
                            className="size-7 text-muted-foreground hover:text-destructive"
                            title="Konuyu sil"
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}

"use client"

import { useState, useTransition } from "react"
import Link from "next/link"
import {
  AlertOctagon,
  AlertTriangle,
  ArrowUpDown,
  Ban,
  Check,
  CheckCircle2,
  Clock,
  ExternalLink,
  Eye,
  Filter,
  Flame,
  FolderSync,
  History,
  Lock,
  MessageSquare,
  Pin,
  Plus,
  RefreshCw,
  Search,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  Unlock,
  User,
  X,
  XCircle,
  FileText,
  Tag,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import {
  bulkUpdateTopics,
  createSpamFilter,
  deleteSpamFilter,
  getBulkTopicsList,
  getContentRevisions,
  getDetailedReports,
  getSpamFilters,
  getAllRevisions,
  resolveReportDetailed,
  testSpamFilterSandbox,
  toggleSpamFilter,
  type BulkTopicItem,
  type DetailedReportItem,
} from "@/app/actions/moderation"
import { timeAgo } from "@/lib/format"

interface Props {
  initialReports: DetailedReportItem[]
  initialBulkData: {
    topics: BulkTopicItem[]
    categories: Array<{ id: number; name: string }>
  }
  initialSpamFilters: Array<{
    id: number
    pattern: string
    type: string
    action: string
    replacement: string | null
    hitCount: number
    isActive: boolean
    createdAt: Date
  }>
  initialRevisions: Array<{
    id: number
    targetType: string
    targetId: number
    previousTitle: string | null
    previousContent: string
    reason: string | null
    createdAt: Date
    editorName: string | null
    editorUsername: string | null
  }>
}

export function ModerationDashboard({
  initialReports,
  initialBulkData,
  initialSpamFilters,
  initialRevisions,
}: Props) {
  const [activeTab, setActiveTab] = useState<"reports" | "bulk" | "spam" | "history">("reports")
  const [pending, startTransition] = useTransition()

  // 1. Report Queue state
  const [reports, setReports] = useState(initialReports)
  const [statusFilter, setStatusFilter] = useState("open")
  const [typeFilter, setTypeFilter] = useState("all")
  const [reportNoteModal, setReportNoteModal] = useState<{ id: number; action: "delete" | "lock" | "dismiss" } | null>(null)
  const [resolutionNote, setResolutionNote] = useState("")

  // 2. Bulk Actions state
  const [bulkTopics, setBulkTopics] = useState(initialBulkData.topics)
  const [categoriesList] = useState(initialBulkData.categories)
  const [selectedTopicIds, setSelectedTopicIds] = useState<number[]>([])
  const [selectedCategoryForBulk, setSelectedCategoryForBulk] = useState<number>(categoriesList[0]?.id || 1)
  const [showCategoryModal, setShowCategoryModal] = useState(false)
  const [bulkSuccessMsg, setBulkSuccessMsg] = useState<string | null>(null)

  // 3. Spam Filter state
  const [spamList, setSpamList] = useState(initialSpamFilters)
  const [showNewFilterModal, setShowNewFilterModal] = useState(false)
  const [sandboxInput, setSandboxInput] = useState("")
  const [sandboxResult, setSandboxResult] = useState<any | null>(null)
  const [filterPattern, setFilterPattern] = useState("")
  const [filterType, setFilterType] = useState<"word" | "domain" | "regex">("word")
  const [filterAction, setFilterAction] = useState<"block" | "censor" | "flag">("block")
  const [filterReplacement, setFilterReplacement] = useState("***")

  // 4. History state
  const [revisions, setRevisions] = useState(initialRevisions)
  const [selectedRevision, setSelectedRevision] = useState<any | null>(null)
  const [historySearch, setHistorySearch] = useState("")

  // --- Handlers: Reports ---
  const handleFilterReports = (newStatus: string, newType: string) => {
    setStatusFilter(newStatus)
    setTypeFilter(newType)
    startTransition(async () => {
      const data = await getDetailedReports(newStatus, newType)
      setReports(data)
    })
  }

  const handleResolveReport = (reportId: number, action: "delete" | "lock" | "dismiss", note?: string) => {
    startTransition(async () => {
      await resolveReportDetailed(reportId, action, note)
      const data = await getDetailedReports(statusFilter, typeFilter)
      setReports(data)
      setReportNoteModal(null)
      setResolutionNote("")
    })
  }

  // --- Handlers: Bulk Actions ---
  const toggleSelectTopic = (id: number) => {
    setSelectedTopicIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    )
  }

  const toggleSelectAll = () => {
    if (selectedTopicIds.length === bulkTopics.length) {
      setSelectedTopicIds([])
    } else {
      setSelectedTopicIds(bulkTopics.map((t) => t.id))
    }
  }

  const handleBulkAction = (action: "lock" | "unlock" | "pin" | "unpin" | "hot" | "unhot" | "delete" | "change_category") => {
    if (selectedTopicIds.length === 0) return
    startTransition(async () => {
      await bulkUpdateTopics(
        selectedTopicIds,
        action,
        action === "change_category" ? selectedCategoryForBulk : undefined
      )
      const updated = await getBulkTopicsList()
      setBulkTopics(updated.topics)
      setSelectedTopicIds([])
      setShowCategoryModal(false)
      setBulkSuccessMsg(`${selectedTopicIds.length} konu başarıyla güncellendi.`)
      setTimeout(() => setBulkSuccessMsg(null), 3500)
    })
  }

  // --- Handlers: Spam Filters ---
  const handleCreateSpamFilter = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!filterPattern.trim()) return

    const formData = new FormData()
    formData.append("pattern", filterPattern.trim())
    formData.append("type", filterType)
    formData.append("action", filterAction)
    formData.append("replacement", filterReplacement)

    startTransition(async () => {
      await createSpamFilter(formData)
      const list = await getSpamFilters()
      setSpamList(list)
      setShowNewFilterModal(false)
      setFilterPattern("")
    })
  }

  const handleToggleSpam = (id: number, current: boolean) => {
    startTransition(async () => {
      await toggleSpamFilter(id, !current)
      setSpamList((prev) =>
        prev.map((item) => (item.id === id ? { ...item, isActive: !current } : item))
      )
    })
  }

  const handleDeleteSpam = (id: number) => {
    startTransition(async () => {
      await deleteSpamFilter(id)
      setSpamList((prev) => prev.filter((item) => item.id !== id))
    })
  }

  const handleTestSandbox = async () => {
    if (!sandboxInput.trim()) return
    const res = await testSpamFilterSandbox(sandboxInput)
    setSandboxResult(res)
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header & Tabs */}
      <div className="flex flex-col gap-4 border-b border-border/60 pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
            Moderasyon & İçerik Denetimi
          </h1>
          <p className="text-xs text-muted-foreground sm:text-sm">
            Şikayetleri inceleyin, toplu konu işlemlerini yönetin ve otomatik spam filtrelerini düzenleyin.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex flex-wrap items-center gap-1.5 rounded-lg border border-border/60 bg-muted/40 p-1">
          <button
            onClick={() => setActiveTab("reports")}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition ${
              activeTab === "reports"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <ShieldAlert className="size-3.5" />
            <span>Şikayet Kuyruğu</span>
            {reports.filter((r) => r.status === "open").length > 0 && (
              <span className="ml-1 rounded-full bg-red-500/20 px-1.5 py-0.2 text-[10px] font-bold text-red-400">
                {reports.filter((r) => r.status === "open").length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab("bulk")}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition ${
              activeTab === "bulk"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <FolderSync className="size-3.5" />
            <span>Toplu İşlemler</span>
          </button>

          <button
            onClick={() => setActiveTab("spam")}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition ${
              activeTab === "spam"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Shield className="size-3.5" />
            <span>Spam & Blacklist</span>
          </button>

          <button
            onClick={() => setActiveTab("history")}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition ${
              activeTab === "history"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <History className="size-3.5" />
            <span>Sürüm Geçmişi</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: ŞİKAYET KUYRUĞU */}
      {/* ========================================================================= */}
      {activeTab === "reports" && (
        <div className="flex flex-col gap-4">
          {/* Filter Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border/60 bg-card/60 p-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold text-muted-foreground">Durum:</span>
              <div className="flex gap-1">
                {[
                  { key: "open", label: "Açık Şikayetler" },
                  { key: "resolved", label: "Çözülenler" },
                  { key: "dismissed", label: "Reddedilenler" },
                  { key: "all", label: "Tümü" },
                ].map((s) => (
                  <button
                    key={s.key}
                    onClick={() => handleFilterReports(s.key, typeFilter)}
                    className={`rounded-md px-2.5 py-1 text-xs font-medium transition ${
                      statusFilter === s.key
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted/50 text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-muted-foreground">Tür:</span>
              <div className="flex gap-1">
                {[
                  { key: "all", label: "Tümü" },
                  { key: "topic", label: "Konular" },
                  { key: "comment", label: "Yorumlar" },
                  { key: "profile", label: "Profiller" },
                ].map((t) => (
                  <button
                    key={t.key}
                    onClick={() => handleFilterReports(statusFilter, t.key)}
                    className={`rounded-md px-2.5 py-1 text-xs font-medium transition ${
                      typeFilter === t.key
                        ? "bg-secondary text-secondary-foreground"
                        : "bg-muted/40 text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Reports List */}
          {reports.length === 0 ? (
            <Card className="flex flex-col items-center justify-center gap-3 p-12 text-center border-dashed">
              <ShieldCheck className="size-10 text-emerald-400" />
              <div>
                <p className="text-base font-semibold">Bu kriterde rapor bulunmuyor</p>
                <p className="text-xs text-muted-foreground">
                  Seçilen filtrelere uyan şikayet kaydı mevcut değil.
                </p>
              </div>
            </Card>
          ) : (
            <div className="flex flex-col gap-3">
              {reports.map((r) => (
                <Card
                  key={r.id}
                  className={`flex flex-col gap-4 border p-4 transition ${
                    r.status === "open"
                      ? "border-amber-500/30 bg-amber-500/5 hover:border-amber-500/50"
                      : "border-border/60 bg-card/40 opacity-80"
                  }`}
                >
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge
                        variant="outline"
                        className={
                          r.targetType === "topic"
                            ? "border-cyan-500/30 text-cyan-400 bg-cyan-500/10"
                            : r.targetType === "comment"
                            ? "border-purple-500/30 text-purple-400 bg-purple-500/10"
                            : "border-amber-500/30 text-amber-400 bg-amber-500/10"
                        }
                      >
                        {r.targetType === "topic" ? "Konu" : r.targetType === "comment" ? "Yorum" : "Profil"}
                      </Badge>

                      <Badge
                        variant="secondary"
                        className={
                          r.status === "open"
                            ? "bg-amber-500/20 text-amber-300"
                            : r.status === "resolved"
                            ? "bg-emerald-500/20 text-emerald-300"
                            : "bg-muted text-muted-foreground"
                        }
                      >
                        {r.status === "open" ? "İnceleniyor" : r.status === "resolved" ? "Çözüldü" : "Reddedildi"}
                      </Badge>

                      <span className="text-xs text-muted-foreground">
                        #{r.id} · {timeAgo(r.createdAt)}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>Bildiren:</span>
                      <span className="font-semibold text-foreground">{r.reporterName}</span>
                    </div>
                  </div>

                  {/* Reported Reason */}
                  <div className="rounded-md border border-red-500/20 bg-red-500/5 p-2.5 text-xs text-red-300">
                    <span className="font-bold">Şikayet Gerekçesi: </span>
                    <span>{r.reason}</span>
                  </div>

                  {/* Reported Target Content Preview */}
                  <div className="rounded-md border border-border/80 bg-background/50 p-3 text-xs">
                    <div className="mb-1 flex items-center justify-between">
                      <div className="flex items-center gap-1.5 font-semibold text-foreground">
                        {r.targetTitle || "Hedef İçerik"}
                        {r.targetSlug && (
                          <Link
                            href={
                              r.targetType === "topic"
                                ? `/konu/${r.targetSlug}`
                                : r.targetType === "comment"
                                ? `/konu/${r.targetSlug}`
                                : `/profil/${r.targetSlug}`
                            }
                            target="_blank"
                            className="text-primary hover:underline"
                          >
                            <ExternalLink className="size-3 inline ml-1" />
                          </Link>
                        )}
                      </div>
                      {r.targetAuthorName && (
                        <span className="text-[11px] text-muted-foreground">
                          Yazar: <strong className="text-foreground">{r.targetAuthorName}</strong>
                        </span>
                      )}
                    </div>
                    {r.targetSnippet ? (
                      <p className="line-clamp-3 text-muted-foreground italic">&ldquo;{r.targetSnippet}&rdquo;</p>
                    ) : (
                      <p className="text-muted-foreground italic">[İçerik önizlemesi mevcut değil veya silinmiş]</p>
                    )}
                  </div>

                  {/* Resolution Note if resolved */}
                  {r.resolutionNote && (
                    <div className="text-xs text-muted-foreground flex items-center gap-1.5">
                      <CheckCircle2 className="size-3.5 text-emerald-400" />
                      <span>Sonuç Notu: {r.resolutionNote}</span>
                    </div>
                  )}

                  {/* Actions */}
                  {r.status === "open" && (
                    <div className="flex flex-wrap items-center justify-end gap-2 border-t border-border/60 pt-3">
                      <Button
                        size="sm"
                        variant="destructive"
                        disabled={pending}
                        onClick={() => setReportNoteModal({ id: r.id, action: "delete" })}
                        className="text-xs"
                      >
                        <Trash2 className="size-3.5 mr-1" />
                        İçeriği Kaldır / Gizle
                      </Button>

                      {r.targetType === "topic" && (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={pending}
                          onClick={() => setReportNoteModal({ id: r.id, action: "lock" })}
                          className="text-xs"
                        >
                          <Lock className="size-3.5 mr-1" />
                          Konuyu Kilitle
                        </Button>
                      )}

                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={pending}
                        onClick={() => handleResolveReport(r.id, "dismiss", "Kural ihlali bulunmadı / yoksayıldı")}
                        className="text-xs text-muted-foreground hover:text-foreground"
                      >
                        <X className="size-3.5 mr-1" />
                        Şikayeti Yoksay
                      </Button>
                    </div>
                  )}
                </Card>
              ))}
            </div>
          )}

          {/* Action Note Modal */}
          {reportNoteModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
              <div className="w-full max-w-md rounded-xl border border-border bg-card p-5 shadow-2xl">
                <h3 className="text-base font-semibold text-foreground">
                  {reportNoteModal.action === "delete" ? "İçeriği Kaldır" : "Konuyu Kilitle"}
                </h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  Bu işlem moderasyon geçmişine kaydedilecek ve şikayet çözüldü olarak işaretlenecektir.
                </p>
                <div className="mt-4">
                  <label className="text-xs font-medium text-foreground">Gerekçe / İşlem Notu (Opsiyonel)</label>
                  <Input
                    value={resolutionNote}
                    onChange={(e) => setResolutionNote(e.target.value)}
                    placeholder="Örn: Topluluk kurallarına aykırı dil kullanımı tespit edildi."
                    className="mt-1 text-xs"
                  />
                </div>
                <div className="mt-5 flex justify-end gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setReportNoteModal(null)
                      setResolutionNote("")
                    }}
                  >
                    İptal
                  </Button>
                  <Button
                    size="sm"
                    variant={reportNoteModal.action === "delete" ? "destructive" : "default"}
                    disabled={pending}
                    onClick={() =>
                      handleResolveReport(
                        reportNoteModal.id,
                        reportNoteModal.action,
                        resolutionNote.trim() || undefined
                      )
                    }
                  >
                    Uygula ve Tamamla
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: TOPLU İŞLEMLER */}
      {/* ========================================================================= */}
      {activeTab === "bulk" && (
        <div className="flex flex-col gap-4">
          {bulkSuccessMsg && (
            <div className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-300">
              <CheckCircle2 className="size-4" />
              <span>{bulkSuccessMsg}</span>
            </div>
          )}

          {/* Bulk Action Controls */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border/80 bg-card p-3 shadow-sm">
            <div className="flex items-center gap-3">
              <Button
                size="sm"
                variant="outline"
                onClick={toggleSelectAll}
                className="text-xs"
              >
                {selectedTopicIds.length === bulkTopics.length ? "Seçimi Kaldır" : "Tümünü Seç"}
              </Button>
              <span className="text-xs text-muted-foreground">
                <strong className="text-foreground">{selectedTopicIds.length}</strong> / {bulkTopics.length} konu seçildi
              </span>
            </div>

            {selectedTopicIds.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={pending}
                  onClick={() => handleBulkAction("pin")}
                  className="text-xs text-cyan-400 hover:text-cyan-300"
                >
                  <Pin className="size-3.5 mr-1" />
                  Sabitle
                </Button>

                <Button
                  size="sm"
                  variant="outline"
                  disabled={pending}
                  onClick={() => handleBulkAction("unpin")}
                  className="text-xs text-muted-foreground"
                >
                  Sabitlemeyi Kaldır
                </Button>

                <Button
                  size="sm"
                  variant="outline"
                  disabled={pending}
                  onClick={() => handleBulkAction("lock")}
                  className="text-xs text-amber-400 hover:text-amber-300"
                >
                  <Lock className="size-3.5 mr-1" />
                  Kilitle
                </Button>

                <Button
                  size="sm"
                  variant="outline"
                  disabled={pending}
                  onClick={() => handleBulkAction("unlock")}
                  className="text-xs text-muted-foreground"
                >
                  <Unlock className="size-3.5 mr-1" />
                  Kilit Aç
                </Button>

                <Button
                  size="sm"
                  variant="outline"
                  disabled={pending}
                  onClick={() => handleBulkAction("hot")}
                  className="text-xs text-orange-400 hover:text-orange-300"
                >
                  <Flame className="size-3.5 mr-1" />
                  Öne Çıkar
                </Button>

                <Button
                  size="sm"
                  variant="outline"
                  disabled={pending}
                  onClick={() => setShowCategoryModal(true)}
                  className="text-xs"
                >
                  <Tag className="size-3.5 mr-1" />
                  Kategori Değiştir
                </Button>

                <Button
                  size="sm"
                  variant="destructive"
                  disabled={pending}
                  onClick={() => {
                    if (confirm(`${selectedTopicIds.length} konuyu ve altındaki tüm yorumları kalıcı olarak silmek istediğinizden emin misiniz?`)) {
                      handleBulkAction("delete")
                    }
                  }}
                  className="text-xs"
                >
                  <Trash2 className="size-3.5 mr-1" />
                  Toplu Sil
                </Button>
              </div>
            )}
          </div>

          {/* Topics Table */}
          <div className="overflow-x-auto rounded-lg border border-border/70 bg-card">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-border/80 bg-muted/40 text-muted-foreground">
                <tr>
                  <th className="w-10 p-3 text-center">
                    <input
                      type="checkbox"
                      checked={selectedTopicIds.length === bulkTopics.length && bulkTopics.length > 0}
                      onChange={toggleSelectAll}
                      className="rounded border-border"
                    />
                  </th>
                  <th className="p-3">Başlık</th>
                  <th className="p-3">Kategori</th>
                  <th className="p-3">Yazar</th>
                  <th className="p-3 text-center">Durum</th>
                  <th className="p-3 text-center">Yorum</th>
                  <th className="p-3 text-right">Tarih</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {bulkTopics.map((topic) => {
                  const isSelected = selectedTopicIds.includes(topic.id)
                  return (
                    <tr
                      key={topic.id}
                      onClick={() => toggleSelectTopic(topic.id)}
                      className={`cursor-pointer transition hover:bg-muted/40 ${
                        isSelected ? "bg-primary/5" : ""
                      }`}
                    >
                      <td className="p-3 text-center" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelectTopic(topic.id)}
                          className="rounded border-border"
                        />
                      </td>
                      <td className="p-3 font-medium text-foreground max-w-xs sm:max-w-md truncate">
                        <Link
                          href={`/konu/${topic.slug}`}
                          target="_blank"
                          onClick={(e) => e.stopPropagation()}
                          className="hover:underline flex items-center gap-1.5"
                        >
                          <span>{topic.title}</span>
                          <ExternalLink className="size-3 opacity-50 shrink-0" />
                        </Link>
                      </td>
                      <td className="p-3">
                        <Badge variant="outline" className="text-[11px] font-normal">
                          {topic.categoryName}
                        </Badge>
                      </td>
                      <td className="p-3 text-muted-foreground">
                        @{topic.authorUsername}
                      </td>
                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          {topic.isPinned && (
                            <span title="Sabitlenmiş" className="text-cyan-400">
                              <Pin className="size-3.5" />
                            </span>
                          )}
                          {topic.isLocked && (
                            <span title="Kilitli" className="text-amber-400">
                              <Lock className="size-3.5" />
                            </span>
                          )}
                          {topic.isHot && (
                            <span title="Öne Çıkarılmış" className="text-orange-400">
                              <Flame className="size-3.5" />
                            </span>
                          )}
                          {!topic.isPinned && !topic.isLocked && !topic.isHot && (
                            <span className="text-[10px] text-muted-foreground/60">Normal</span>
                          )}
                        </div>
                      </td>
                      <td className="p-3 text-center text-muted-foreground font-mono">
                        {topic.commentCount}
                      </td>
                      <td className="p-3 text-right text-muted-foreground">
                        {timeAgo(topic.createdAt)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Change Category Modal */}
          {showCategoryModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
              <div className="w-full max-w-sm rounded-xl border border-border bg-card p-5 shadow-2xl">
                <h3 className="text-sm font-semibold text-foreground">Toplu Kategori Değiştir</h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  Seçilen {selectedTopicIds.length} konuyu yeni bir kategoriye taşıyın.
                </p>
                <div className="mt-4">
                  <label className="text-xs font-medium text-foreground">Hedef Kategori</label>
                  <select
                    value={selectedCategoryForBulk}
                    onChange={(e) => setSelectedCategoryForBulk(Number(e.target.value))}
                    className="mt-1.5 w-full rounded-md border border-border bg-background px-3 py-2 text-xs"
                  >
                    {categoriesList.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="mt-5 flex justify-end gap-2">
                  <Button size="sm" variant="outline" onClick={() => setShowCategoryModal(false)}>
                    İptal
                  </Button>
                  <Button size="sm" disabled={pending} onClick={() => handleBulkAction("change_category")}>
                    Taşı ve Güncelle
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: SPAM & KELİME FİLTRESİ (BLACKLIST) */}
      {/* ========================================================================= */}
      {activeTab === "spam" && (
        <div className="flex flex-col gap-6">
          {/* Header & New Rule Button */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-foreground">Aktif Filtre Kuralları</h2>
              <p className="text-xs text-muted-foreground">
                Girdiğiniz kelimeler ve domain bağlantıları yeni konularda veya yorumlarda otomatik denetlenir.
              </p>
            </div>
            <Button size="sm" onClick={() => setShowNewFilterModal(true)} className="text-xs">
              <Plus className="size-3.5 mr-1" />
              Yeni Kural Ekle
            </Button>
          </div>

          {/* Rules Table */}
          <div className="overflow-x-auto rounded-lg border border-border/70 bg-card">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-border/80 bg-muted/40 text-muted-foreground">
                <tr>
                  <th className="p-3">Filtre Kalıbı</th>
                  <th className="p-3">Kural Türü</th>
                  <th className="p-3">Uygulanan Eylem</th>
                  <th className="p-3">Sansür Değişimi</th>
                  <th className="p-3 text-center">Yakalanma</th>
                  <th className="p-3 text-center">Durum</th>
                  <th className="p-3 text-right">İşlemler</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {spamList.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-6 text-center text-muted-foreground">
                      Tanımlı spam filtresi bulunmuyor. Yeni bir kelime veya domain ekleyebilirsiniz.
                    </td>
                  </tr>
                ) : (
                  spamList.map((item) => (
                    <tr key={item.id} className="hover:bg-muted/30">
                      <td className="p-3 font-mono font-medium text-foreground">
                        {item.pattern}
                      </td>
                      <td className="p-3">
                        <Badge variant="outline" className="text-[10px]">
                          {item.type === "word" ? "Kelime" : item.type === "domain" ? "Domain" : "Regex"}
                        </Badge>
                      </td>
                      <td className="p-3">
                        <Badge
                          variant="secondary"
                          className={
                            item.action === "block"
                              ? "bg-red-500/20 text-red-300"
                              : item.action === "censor"
                              ? "bg-amber-500/20 text-amber-300"
                              : "bg-blue-500/20 text-blue-300"
                          }
                        >
                          {item.action === "block"
                            ? "Engelle (Yayınlama)"
                            : item.action === "censor"
                            ? "Sansürle (***)"
                            : "İncelemeye Al"}
                        </Badge>
                      </td>
                      <td className="p-3 font-mono text-muted-foreground">
                        {item.replacement || "—"}
                      </td>
                      <td className="p-3 text-center font-mono font-semibold text-foreground">
                        {item.hitCount}
                      </td>
                      <td className="p-3 text-center">
                        <Switch
                          checked={item.isActive}
                          onCheckedChange={() => handleToggleSpam(item.id, item.isActive)}
                        />
                      </td>
                      <td className="p-3 text-right">
                        <button
                          onClick={() => handleDeleteSpam(item.id)}
                          className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition"
                          title="Filtreyi Sil"
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

          {/* Test Sandbox */}
          <div className="rounded-lg border border-border/80 bg-card p-4">
            <h3 className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <ShieldAlert className="size-4 text-cyan-400" />
              Filtre Test Sandbox&apos;ı
            </h3>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Bir metin yazarak aktif kurallara takılıp takılmayacağını ve nasıl sansürleneceğini canlı test edin.
            </p>

            <div className="mt-3 flex flex-col gap-2 sm:flex-row">
              <Input
                value={sandboxInput}
                onChange={(e) => setSandboxInput(e.target.value)}
                placeholder="Örnek: 'Günün en iyi bonusu için spam-casino.com adresine gelin'"
                className="text-xs"
              />
              <Button size="sm" onClick={handleTestSandbox} className="shrink-0 text-xs">
                Filtreyi Dene
              </Button>
            </div>

            {sandboxResult && (
              <div className="mt-3 rounded-md border border-border/60 bg-background/80 p-3 text-xs flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-foreground">Sonuç:</span>
                  {sandboxResult.allowed ? (
                    <Badge variant="outline" className="border-emerald-500/40 text-emerald-400 bg-emerald-500/10">
                      Geçti (İzin Verildi)
                    </Badge>
                  ) : (
                    <Badge variant="destructive">
                      Engellendi (Yasaklı İfade)
                    </Badge>
                  )}
                </div>

                {!sandboxResult.allowed && (
                  <p className="text-red-400 font-medium">{sandboxResult.blockedReason}</p>
                )}

                <div>
                  <span className="text-muted-foreground">Filtrelenmiş Nihai Metin: </span>
                  <span className="font-mono text-foreground font-semibold">
                    {sandboxResult.filteredContent}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* New Rule Modal */}
          {showNewFilterModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
              <div className="w-full max-w-md rounded-xl border border-border bg-card p-5 shadow-2xl">
                <h3 className="text-sm font-semibold text-foreground">Yeni Kural / Yasaklı Kelime Ekle</h3>
                <form onSubmit={handleCreateSpamFilter} className="mt-4 flex flex-col gap-3">
                  <div>
                    <label className="text-xs font-medium text-foreground">Kalıp / Kelime / Domain</label>
                    <Input
                      value={filterPattern}
                      onChange={(e) => setFilterPattern(e.target.value)}
                      placeholder="Örn: casino, bahis, bit.ly"
                      required
                      className="mt-1 text-xs"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-medium text-foreground">Tür</label>
                      <select
                        value={filterType}
                        onChange={(e) => setFilterType(e.target.value as any)}
                        className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-xs"
                      >
                        <option value="word">Kelime</option>
                        <option value="domain">Domain / Link</option>
                        <option value="regex">Düzenli İfade (Regex)</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-xs font-medium text-foreground">Eylem</label>
                      <select
                        value={filterAction}
                        onChange={(e) => setFilterAction(e.target.value as any)}
                        className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-xs"
                      >
                        <option value="block">Engelle (Paylaşımı Reddet)</option>
                        <option value="censor">Sansürle (*** Yap)</option>
                        <option value="flag">Otomatik Şikayet Aç</option>
                      </select>
                    </div>
                  </div>

                  {filterAction === "censor" && (
                    <div>
                      <label className="text-xs font-medium text-foreground">Sansür Değişim Metni</label>
                      <Input
                        value={filterReplacement}
                        onChange={(e) => setFilterReplacement(e.target.value)}
                        placeholder="***"
                        className="mt-1 text-xs"
                      />
                    </div>
                  )}

                  <div className="mt-4 flex justify-end gap-2">
                    <Button size="sm" type="button" variant="outline" onClick={() => setShowNewFilterModal(false)}>
                      İptal
                    </Button>
                    <Button size="sm" type="submit" disabled={pending}>
                      Kuralı Kaydet
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: İÇERİK SÜRÜM GEÇMİŞİ (EDIT HISTORY) */}
      {/* ========================================================================= */}
      {activeTab === "history" && (
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-foreground">İçerik Revizyon ve Düzenleme Kayıtları</h2>
              <p className="text-xs text-muted-foreground">
                Kullanıcıların veya yetkililerin düzenlediği/sildiği iletilerin orijinal halini ve geçmişini görün.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Input
                value={historySearch}
                onChange={(e) => setHistorySearch(e.target.value)}
                placeholder="Geçmişte ara (yazar veya metin)..."
                className="h-8 text-xs w-56"
              />
            </div>
          </div>

          <div className="overflow-x-auto rounded-lg border border-border/70 bg-card">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-border/80 bg-muted/40 text-muted-foreground">
                <tr>
                  <th className="p-3">Tarih</th>
                  <th className="p-3">Tür</th>
                  <th className="p-3">Hedef ID</th>
                  <th className="p-3">Düzenleyen</th>
                  <th className="p-3">Gerekçe / Not</th>
                  <th className="p-3">Önceki İçerik Özeti</th>
                  <th className="p-3 text-right">İncele</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {revisions.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-6 text-center text-muted-foreground">
                      Henüz içerik revizyon kaydı bulunmuyor.
                    </td>
                  </tr>
                ) : (
                  revisions
                    .filter((r) => {
                      if (!historySearch.trim()) return true
                      const term = historySearch.toLowerCase()
                      return (
                        r.previousContent.toLowerCase().includes(term) ||
                        (r.editorName && r.editorName.toLowerCase().includes(term)) ||
                        (r.editorUsername && r.editorUsername.toLowerCase().includes(term))
                      )
                    })
                    .map((rev) => (
                      <tr key={rev.id} className="hover:bg-muted/30">
                        <td className="p-3 text-muted-foreground">
                          {timeAgo(rev.createdAt)}
                        </td>
                        <td className="p-3">
                          <Badge variant="outline" className="text-[10px]">
                            {rev.targetType === "topic" ? "Konu" : "Yorum"}
                          </Badge>
                        </td>
                        <td className="p-3 font-mono text-muted-foreground">
                          #{rev.targetId}
                        </td>
                        <td className="p-3 font-medium text-foreground">
                          {rev.editorName || `@${rev.editorUsername}` || "Sistem"}
                        </td>
                        <td className="p-3 text-muted-foreground">
                          {rev.reason || "—"}
                        </td>
                        <td className="p-3 max-w-xs truncate text-muted-foreground italic">
                          {rev.previousTitle ? `[${rev.previousTitle}] ` : ""}
                          {rev.previousContent}
                        </td>
                        <td className="p-3 text-right">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setSelectedRevision(rev)}
                            className="h-7 px-2 text-xs"
                          >
                            <Eye className="size-3.5 mr-1" />
                            Görüntüle
                          </Button>
                        </td>
                      </tr>
                    ))
                )}
              </tbody>
            </table>
          </div>

          {/* Revision Diff / View Modal */}
          {selectedRevision && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
              <div className="w-full max-w-xl rounded-xl border border-border bg-card p-5 shadow-2xl">
                <div className="flex items-center justify-between border-b border-border/80 pb-3">
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">
                      İçerik Revizyon Detayı #{selectedRevision.id}
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      Düzenleyen: {selectedRevision.editorName || "Üye"} · {timeAgo(selectedRevision.createdAt)}
                    </p>
                  </div>
                  <button
                    onClick={() => setSelectedRevision(null)}
                    className="rounded p-1 text-muted-foreground hover:bg-muted"
                  >
                    <X className="size-4" />
                  </button>
                </div>

                <div className="mt-4 flex flex-col gap-3 text-xs">
                  {selectedRevision.previousTitle && (
                    <div>
                      <span className="font-semibold text-muted-foreground">Önceki Başlık:</span>
                      <p className="mt-1 rounded border border-border bg-background p-2 font-mono text-foreground">
                        {selectedRevision.previousTitle}
                      </p>
                    </div>
                  )}

                  <div>
                    <span className="font-semibold text-muted-foreground">Önceki İçerik (Orijinal Hal):</span>
                    <pre className="mt-1 max-h-60 overflow-y-auto whitespace-pre-wrap rounded border border-border bg-background p-3 font-mono text-foreground leading-relaxed">
                      {selectedRevision.previousContent}
                    </pre>
                  </div>

                  {selectedRevision.reason && (
                    <div className="text-muted-foreground">
                      <span className="font-semibold">Düzenleme Nedeni:</span> {selectedRevision.reason}
                    </div>
                  )}
                </div>

                <div className="mt-5 flex justify-end">
                  <Button size="sm" onClick={() => setSelectedRevision(null)}>
                    Kapat
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

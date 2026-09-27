"use client"

import { useState, useTransition } from "react"
import {
  triggerCronJob,
  toggleCronJob,
  updateCronSchedule,
  clearCronLogs,
} from "@/app/actions/admin"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { timeAgo } from "@/lib/format"
import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  Clock,
  Code2,
  Copy,
  ExternalLink,
  Flame,
  Info,
  Loader2,
  Play,
  Power,
  RefreshCw,
  SlidersHorizontal,
  Terminal,
  Trash2,
  Zap,
} from "lucide-react"

export interface CronJobItem {
  id: string
  name: string
  description: string
  schedule: string
  endpoint: string
  isEnabled: boolean
  lastRunAt: Date | string | null
  lastStatus: string
  lastError: string | null
  lastResultSummary: string | null
  runCount: number
  nextScheduledAt: Date | string | null
  updatedAt: Date | string
}

export interface CronLogItem {
  id: number
  cronJobId: string
  status: string
  durationMs: number | null
  message: string | null
  output: any
  createdAt: Date | string
}

interface CronManagerProps {
  initialJobs: CronJobItem[]
  initialLogs: CronLogItem[]
}

const SCHEDULE_PRESETS = [
  { label: "Her 10 dakikada bir", value: "*/10 * * * *" },
  { label: "Her 30 dakikada bir", value: "*/30 * * * *" },
  { label: "Her saat başı", value: "0 * * * *" },
  { label: "Her 2 saatte bir", value: "0 */2 * * *" },
  { label: "Her sabah 07:00 (TR)", value: "0 7 * * *" },
  { label: "Her sabah 09:00 (TR)", value: "0 9 * * *" },
  { label: "Her gece 00:00 (TR)", value: "0 0 * * *" },
]

function getScheduleDescription(cronExpr: string): string {
  switch (cronExpr.trim()) {
    case "*/10 * * * *":
      return "Her 10 dakikada bir"
    case "*/30 * * * *":
      return "Her 30 dakikada bir"
    case "0 * * * *":
      return "Her saat başı (dakika 00)"
    case "0 */2 * * *":
      return "Her 2 saatte bir"
    case "0 7 * * *":
      return "Her gün saat 07:00'de (TR)"
    case "0 9 * * *":
      return "Her gün saat 09:00'da (TR)"
    case "0 0 * * *":
      return "Her gece yarısı 00:00'da"
    default:
      return `Özel planlama: ${cronExpr}`
  }
}

export function CronManager({ initialJobs, initialLogs }: CronManagerProps) {
  const [jobs, setJobs] = useState<CronJobItem[]>(initialJobs)
  const [logs, setLogs] = useState<CronLogItem[]>(initialLogs)
  const [runningJobId, setRunningJobId] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<{ id: string; message: string; ok: boolean } | null>(null)
  const [editingScheduleId, setEditingScheduleId] = useState<string | null>(null)
  const [scheduleInputs, setScheduleInputs] = useState<Record<string, string>>({})
  const [copiedKey, setCopiedKey] = useState<string | null>(null)
  const [selectedFilterJob, setSelectedFilterJob] = useState<string>("all")
  const [isPending, startTransition] = useTransition()

  const copyToClipboard = (key: string, text: string) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text)
      setCopiedKey(key)
      setTimeout(() => setCopiedKey(null), 2000)
    }
  }

  const handleToggle = (jobId: string, currentEnabled: boolean) => {
    const nextState = !currentEnabled
    setJobs((prev) =>
      prev.map((j) => (j.id === jobId ? { ...j, isEnabled: nextState } : j))
    )
    startTransition(async () => {
      try {
        await toggleCronJob(jobId, nextState)
      } catch (err: any) {
        console.error("Cron aç/kapa hatası:", err)
        setJobs((prev) =>
          prev.map((j) => (j.id === jobId ? { ...j, isEnabled: currentEnabled } : j))
        )
      }
    })
  }

  const handleTrigger = async (jobId: string) => {
    setRunningJobId(jobId)
    setFeedback(null)
    try {
      const res = await triggerCronJob(jobId)
      setFeedback({
        id: jobId,
        message: `${res.message} (${res.durationMs}ms)`,
        ok: res.status === "success",
      })

      // Update local jobs view
      setJobs((prev) =>
        prev.map((j) =>
          j.id === jobId
            ? {
                ...j,
                lastRunAt: new Date(),
                lastStatus: res.status,
                lastResultSummary: res.message,
                lastError: res.status === "failed" ? res.message : null,
                runCount: j.runCount + 1,
              }
            : j
        )
      )

      // Prepend to logs
      setLogs((prev) => [
        {
          id: Date.now(),
          cronJobId: jobId,
          status: res.status,
          durationMs: res.durationMs,
          message: res.message,
          output: null,
          createdAt: new Date(),
        },
        ...prev,
      ])
    } catch (err: any) {
      setFeedback({
        id: jobId,
        message: err.message || "Tetikleme başarısız oldu.",
        ok: false,
      })
    } finally {
      setRunningJobId(null)
    }
  }

  const handleSaveSchedule = (jobId: string) => {
    const expr = scheduleInputs[jobId]?.trim()
    if (!expr) return

    setJobs((prev) =>
      prev.map((j) => (j.id === jobId ? { ...j, schedule: expr } : j))
    )
    setEditingScheduleId(null)

    startTransition(async () => {
      try {
        await updateCronSchedule(jobId, expr)
      } catch (err: any) {
        console.error("Planlama güncelleme hatası:", err)
      }
    })
  }

  const handleClearLogs = () => {
    if (!confirm("Tüm cron çalışma logları temizlensin mi?")) return
    setLogs([])
    startTransition(async () => {
      await clearCronLogs()
    })
  }

  const activeCount = jobs.filter((j) => j.isEnabled).length
  const totalRuns = jobs.reduce((acc, cur) => acc + (cur.runCount || 0), 0)
  const filteredLogs =
    selectedFilterJob === "all"
      ? logs
      : logs.filter((l) => l.cronJobId === selectedFilterJob)

  return (
    <div className="space-y-6">
      {/* Top Stats Overview */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card className="p-4 flex flex-col gap-1">
          <div className="flex items-center justify-between">
            <Clock className="size-4 text-primary" />
            <Badge variant="outline" className="text-[10px]">Toplam</Badge>
          </div>
          <p className="text-2xl font-bold">{jobs.length}</p>
          <p className="text-xs text-muted-foreground">Zamanlanmış Görev</p>
        </Card>

        <Card className="p-4 flex flex-col gap-1">
          <div className="flex items-center justify-between">
            <Power className="size-4 text-emerald-500" />
            <Badge variant="outline" className="border-emerald-500/30 text-emerald-400 text-[10px]">Aktif</Badge>
          </div>
          <p className="text-2xl font-bold">{activeCount}</p>
          <p className="text-xs text-muted-foreground">Çalışır Durumda</p>
        </Card>

        <Card className="p-4 flex flex-col gap-1">
          <div className="flex items-center justify-between">
            <Zap className="size-4 text-amber-500" />
            <Badge variant="outline" className="text-[10px]">Sayaç</Badge>
          </div>
          <p className="text-2xl font-bold">{totalRuns}</p>
          <p className="text-xs text-muted-foreground">Toplam Tetikleme</p>
        </Card>

        <Card className="p-4 flex flex-col gap-1">
          <div className="flex items-center justify-between">
            <CheckCircle2 className="size-4 text-cyan-500" />
            <Badge variant="outline" className="text-[10px]">Oto AI</Badge>
          </div>
          <p className="text-2xl font-bold">Aktif</p>
          <p className="text-xs text-muted-foreground">Robot Moderatörler</p>
        </Card>
      </div>

      {/* Cron Jobs Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
              <SlidersHorizontal className="size-4 text-primary" />
              Zamanlanmış Görevler (Cron Jobs)
            </h2>
            <p className="text-xs text-muted-foreground">
              Forumun otomatik içerik üretim, moderasyon ve özetleme mekanizmalarını yönetin.
            </p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {jobs.map((job) => {
            const isRunning = runningJobId === job.id
            const isEditingSchedule = editingScheduleId === job.id
            const currentScheduleVal = scheduleInputs[job.id] ?? job.schedule

            return (
              <Card
                key={job.id}
                className={`flex flex-col justify-between p-5 border transition-all ${
                  job.isEnabled
                    ? "border-border/80 bg-card/90"
                    : "border-border/40 bg-card/40 opacity-75"
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm sm:text-base text-foreground">
                          {job.name}
                        </span>
                        {job.isEnabled ? (
                          <Badge
                            variant="outline"
                            className="border-emerald-500/30 bg-emerald-500/10 text-emerald-400 text-[10px]"
                          >
                            Aktif
                          </Badge>
                        ) : (
                          <Badge
                            variant="outline"
                            className="border-muted text-muted-foreground text-[10px]"
                          >
                            Devre Dışı
                          </Badge>
                        )}
                      </div>
                      <code className="mt-1 inline-block text-[11px] font-mono text-primary bg-primary/10 px-1.5 py-0.5 rounded">
                        {job.endpoint}
                      </code>
                    </div>

                    <Button
                      type="button"
                      variant={job.isEnabled ? "outline" : "secondary"}
                      size="sm"
                      onClick={() => handleToggle(job.id, job.isEnabled)}
                      className={`text-xs gap-1.5 h-8 ${
                        job.isEnabled
                          ? "border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10"
                          : ""
                      }`}
                    >
                      <Power className="size-3.5" />
                      {job.isEnabled ? "Kapat" : "Aç"}
                    </Button>
                  </div>

                  <p className="mt-2.5 text-xs text-muted-foreground leading-relaxed">
                    {job.description}
                  </p>

                  {/* Schedule info box */}
                  <div className="mt-3.5 rounded-lg border border-border/60 bg-muted/30 p-2.5 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground flex items-center gap-1.5 font-medium">
                        <Calendar className="size-3.5 text-primary" />
                        Plan: {getScheduleDescription(job.schedule)}
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          if (isEditingSchedule) {
                            setEditingScheduleId(null)
                          } else {
                            setEditingScheduleId(job.id)
                            setScheduleInputs((prev) => ({
                              ...prev,
                              [job.id]: job.schedule,
                            }))
                          }
                        }}
                        className="h-6 px-2 text-[11px] text-muted-foreground hover:text-foreground"
                      >
                        {isEditingSchedule ? "Vazgeç" : "Değiştir"}
                      </Button>
                    </div>

                    {isEditingSchedule ? (
                      <div className="mt-2.5 space-y-2 border-t border-border/50 pt-2">
                        <div className="flex flex-wrap gap-1">
                          {SCHEDULE_PRESETS.map((p) => (
                            <button
                              key={p.value}
                              type="button"
                              onClick={() =>
                                setScheduleInputs((prev) => ({
                                  ...prev,
                                  [job.id]: p.value,
                                }))
                              }
                              className={`text-[10px] px-2 py-0.5 rounded border transition-colors ${
                                currentScheduleVal === p.value
                                  ? "border-primary bg-primary/20 text-primary font-bold"
                                  : "border-border text-muted-foreground hover:bg-muted"
                              }`}
                            >
                              {p.label}
                            </button>
                          ))}
                        </div>

                        <div className="flex items-center gap-2 pt-1">
                          <input
                            type="text"
                            value={currentScheduleVal}
                            onChange={(e) =>
                              setScheduleInputs((prev) => ({
                                ...prev,
                                [job.id]: e.target.value,
                              }))
                            }
                            placeholder="Cron ifadesi örn: 0 9 * * *"
                            className="flex-1 rounded-md border border-border bg-background px-2.5 py-1 text-xs font-mono"
                          />
                          <Button
                            type="button"
                            size="sm"
                            className="h-7 text-xs"
                            onClick={() => handleSaveSchedule(job.id)}
                          >
                            Kaydet
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="mt-1 flex items-center justify-between text-[11px] font-mono text-muted-foreground">
                        <span>CRON: {job.schedule}</span>
                        <span>{job.runCount} kez tetiklendi</span>
                      </div>
                    )}
                  </div>

                  {/* Status & Last Run info */}
                  <div className="mt-3 space-y-1.5 text-xs">
                    <div className="flex items-center justify-between text-muted-foreground">
                      <span>Son Çalışma:</span>
                      <span className="font-medium text-foreground">
                        {job.lastRunAt ? timeAgo(job.lastRunAt) : "Henüz çalıştırılmadı"}
                      </span>
                    </div>

                    {job.lastStatus && job.lastStatus !== "idle" && (
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Son Durum:</span>
                        <Badge
                          variant="outline"
                          className={
                            job.lastStatus === "success"
                              ? "border-emerald-500/40 text-emerald-400 bg-emerald-500/10 text-[10px]"
                              : "border-rose-500/40 text-rose-400 bg-rose-500/10 text-[10px]"
                          }
                        >
                          {job.lastStatus === "success" ? "Başarılı" : "Hata Alındı"}
                        </Badge>
                      </div>
                    )}

                    {job.lastResultSummary && (
                      <p className="text-[11px] text-muted-foreground italic bg-background/50 rounded p-1.5 border border-border/40 truncate">
                        "{job.lastResultSummary}"
                      </p>
                    )}

                    {job.lastError && (
                      <div className="flex items-start gap-1.5 text-[11px] text-rose-400 bg-rose-500/10 p-2 rounded border border-rose-500/20">
                        <AlertCircle className="size-3.5 shrink-0 mt-0.5" />
                        <span>{job.lastError}</span>
                      </div>
                    )}

                    {feedback && feedback.id === job.id && (
                      <div
                        className={`mt-2 flex items-center gap-1.5 text-xs p-2 rounded border ${
                          feedback.ok
                            ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                            : "bg-rose-500/10 border-rose-500/30 text-rose-300"
                        }`}
                      >
                        {feedback.ok ? (
                          <CheckCircle2 className="size-3.5 shrink-0 text-emerald-400" />
                        ) : (
                          <AlertCircle className="size-3.5 shrink-0 text-rose-400" />
                        )}
                        <span>{feedback.message}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-border/50 flex items-center justify-end gap-2">
                  <Button
                    type="button"
                    variant="default"
                    size="sm"
                    disabled={isRunning}
                    onClick={() => handleTrigger(job.id)}
                    className="gap-1.5 text-xs h-8"
                  >
                    {isRunning ? (
                      <>
                        <Loader2 className="size-3.5 animate-spin" />
                        <span>Tetikleniyor...</span>
                      </>
                    ) : (
                      <>
                        <Play className="size-3.5 fill-current" />
                        <span>Şimdi Tetikle</span>
                      </>
                    )}
                  </Button>
                </div>
              </Card>
            )
          })}
        </div>
      </div>

      {/* Execution Logs Table */}
      <Card className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/70 pb-3 mb-4">
          <div>
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Terminal className="size-4 text-primary" />
              Son Çalışma Kayıtları (Execution Logs)
            </h3>
            <p className="text-xs text-muted-foreground">
              Zamanlanmış ve manuel tetiklenen görevlerin işlem geçmişi
            </p>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={selectedFilterJob}
              onChange={(e) => setSelectedFilterJob(e.target.value)}
              className="rounded-md border border-border bg-background px-2.5 py-1 text-xs text-foreground"
            >
              <option value="all">Tüm Görevler</option>
              {jobs.map((j) => (
                <option key={j.id} value={j.id}>
                  {j.name}
                </option>
              ))}
            </select>

            {logs.length > 0 && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleClearLogs}
                className="h-7 text-xs gap-1 text-muted-foreground hover:text-rose-400"
              >
                <Trash2 className="size-3" />
                <span>Temizle</span>
              </Button>
            )}
          </div>
        </div>

        {filteredLogs.length === 0 ? (
          <div className="py-8 text-center text-xs text-muted-foreground">
            Kayıt bulunamadı. Bir cron işi çalıştırıldığında kayıtlar burada listelenecektir.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-border/60 text-muted-foreground">
                <tr>
                  <th className="pb-2 font-medium">Tarih</th>
                  <th className="pb-2 font-medium">Görev</th>
                  <th className="pb-2 font-medium">Durum</th>
                  <th className="pb-2 font-medium">Süre</th>
                  <th className="pb-2 font-medium">Sonuç / Mesaj</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {filteredLogs.map((log) => {
                  const job = jobs.find((j) => j.id === log.cronJobId)
                  return (
                    <tr key={log.id} className="hover:bg-muted/30">
                      <td className="py-2.5 whitespace-nowrap font-mono text-[11px] text-muted-foreground">
                        {timeAgo(log.createdAt)}
                      </td>
                      <td className="py-2.5 font-medium text-foreground">
                        {job?.name || log.cronJobId}
                      </td>
                      <td className="py-2.5">
                        <Badge
                          variant="outline"
                          className={
                            log.status === "success"
                              ? "border-emerald-500/40 text-emerald-400 bg-emerald-500/10 text-[10px]"
                              : "border-rose-500/40 text-rose-400 bg-rose-500/10 text-[10px]"
                          }
                        >
                          {log.status === "success" ? "Başarılı" : "Hata"}
                        </Badge>
                      </td>
                      <td className="py-2.5 font-mono text-[11px] text-muted-foreground whitespace-nowrap">
                        {log.durationMs !== null ? `${log.durationMs}ms` : "-"}
                      </td>
                      <td className="py-2.5 text-muted-foreground max-w-xs truncate">
                        {log.message || "-"}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Integration Guide (Vercel Cron, cron-job.org, curl) */}
      <Card className="p-5 border-dashed">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-1.5">
          <Code2 className="size-4 text-primary" />
          Dış Servis Entegrasyonu (Vercel Cron / cron-job.org)
        </h3>
        <p className="text-xs text-muted-foreground leading-relaxed mb-4">
          Tüm cron endpoint'leri yetkisiz erişime karşı{" "}
          <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-primary">
            Authorization: Bearer CRON_SECRET
          </code>{" "}
          ile korunmaktadır. Aşağıdaki konfigürasyonları üretim ortamında otomasyon için kullanabilirsiniz.
        </p>

        <div className="grid gap-3 sm:grid-cols-2 text-xs">
          <div className="rounded-lg border border-border bg-background p-3.5 space-y-2">
            <div className="flex items-center justify-between font-semibold text-foreground">
              <span>vercel.json Tanımı</span>
              <button
                type="button"
                onClick={() =>
                  copyToClipboard(
                    "vercel",
                    JSON.stringify(
                      {
                        crons: [
                          { path: "/api/cron/daily-topic", schedule: "0 6 * * *" },
                          { path: "/api/cron/daily-summary", schedule: "0 4 * * *" },
                          { path: "/api/cron/ai-activity", schedule: "0 * * * *" },
                          { path: "/api/cron/process-replies", schedule: "*/10 * * * *" },
                        ],
                      },
                      null,
                      2
                    )
                  )
                }
                className="text-[11px] text-primary hover:underline flex items-center gap-1"
              >
                {copiedKey === "vercel" ? <CheckCircle2 className="size-3" /> : <Copy className="size-3" />}
                {copiedKey === "vercel" ? "Kopyalandı" : "Kopyala"}
              </button>
            </div>
            <pre className="text-[11px] font-mono text-muted-foreground bg-muted/40 p-2.5 rounded overflow-x-auto">
{`{
  "crons": [
    { "path": "/api/cron/daily-topic", "schedule": "0 6 * * *" },
    { "path": "/api/cron/daily-summary", "schedule": "0 4 * * *" },
    { "path": "/api/cron/ai-activity", "schedule": "0 * * * *" },
    { "path": "/api/cron/process-replies", "schedule": "*/10 * * * *" }
  ]
}`}
            </pre>
          </div>

          <div className="rounded-lg border border-border bg-background p-3.5 space-y-2">
            <div className="flex items-center justify-between font-semibold text-foreground">
              <span>cURL ile Manuel Tetikleme</span>
              <button
                type="button"
                onClick={() =>
                  copyToClipboard(
                    "curl",
                    `curl -X GET "https://neonsform.com/api/cron/daily-topic" -H "Authorization: Bearer $CRON_SECRET"`
                  )
                }
                className="text-[11px] text-primary hover:underline flex items-center gap-1"
              >
                {copiedKey === "curl" ? <CheckCircle2 className="size-3" /> : <Copy className="size-3" />}
                {copiedKey === "curl" ? "Kopyalandı" : "Kopyala"}
              </button>
            </div>
            <pre className="text-[11px] font-mono text-muted-foreground bg-muted/40 p-2.5 rounded overflow-x-auto whitespace-pre-wrap">
curl -X GET "https://neonsform.com/api/cron/daily-topic" \\
  -H "Authorization: Bearer $CRON_SECRET"
            </pre>
            <p className="text-[11px] text-muted-foreground pt-1">
              cron-job.org veya EasyCron üzerinde HTTP Header olarak <code>Authorization: Bearer [CRON_SECRET]</code> ekleyerek ücretsiz zamanlayıcı kurabilirsiniz.
            </p>
          </div>
        </div>
      </Card>
    </div>
  )
}

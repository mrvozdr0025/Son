"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { AlertCircle, AlertTriangle, Info, Sparkles, X, ChevronRight } from "lucide-react"

export interface AnnouncementData {
  id: number
  title: string
  message: string
  linkUrl: string | null
  linkText: string | null
  bannerType: string
  isActive: boolean
}

export function AnnouncementBanner({ initialData }: { initialData?: AnnouncementData | null }) {
  const [data, setData] = useState<AnnouncementData | null>(initialData ?? null)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    if (!initialData) return
    const dismissedKey = `dismissed_announcement_${initialData.id}`
    if (localStorage.getItem(dismissedKey) === "true") {
      setDismissed(true)
    }
  }, [initialData])

  if (!data || !data.isActive || dismissed) {
    return null
  }

  const handleDismiss = () => {
    setDismissed(true)
    try {
      localStorage.setItem(`dismissed_announcement_${data.id}`, "true")
    } catch {
      // ignore
    }
  }

  const typeConfig: Record<
    string,
    { bg: string; border: string; text: string; icon: any; iconColor: string; badge: string; badgeBg: string }
  > = {
    info: {
      bg: "bg-cyan-950/70 backdrop-blur-md",
      border: "border-cyan-500/30",
      text: "text-cyan-100",
      icon: Info,
      iconColor: "text-cyan-400",
      badge: "BİLGİ",
      badgeBg: "bg-cyan-500/20 text-cyan-300 border-cyan-500/30",
    },
    warning: {
      bg: "bg-amber-950/70 backdrop-blur-md",
      border: "border-amber-500/30",
      text: "text-amber-100",
      icon: AlertTriangle,
      iconColor: "text-amber-400",
      badge: "DUYURU",
      badgeBg: "bg-amber-500/20 text-amber-300 border-amber-500/30",
    },
    critical: {
      bg: "bg-red-950/80 backdrop-blur-md",
      border: "border-red-500/40",
      text: "text-red-100",
      icon: AlertCircle,
      iconColor: "text-red-400 animate-pulse",
      badge: "ACİL / ÖNEMLİ",
      badgeBg: "bg-red-500/30 text-red-200 border-red-500/40 animate-pulse",
    },
    event: {
      bg: "bg-purple-950/70 backdrop-blur-md",
      border: "border-purple-500/30",
      text: "text-purple-100",
      icon: Sparkles,
      iconColor: "text-purple-400",
      badge: "ETKİNLİK",
      badgeBg: "bg-purple-500/20 text-purple-300 border-purple-500/30",
    },
  }

  const currentTheme = typeConfig[data.bannerType] || typeConfig.info
  const IconComp = currentTheme.icon

  return (
    <div
      role="region"
      aria-label="Önemli Duyuru"
      className={`relative z-50 w-full border-b px-4 py-2.5 transition-all duration-300 ${currentTheme.bg} ${currentTheme.border} ${currentTheme.text}`}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 text-xs sm:text-sm">
        <div className="flex flex-1 items-center gap-2.5 sm:gap-3">
          <div className="flex shrink-0 items-center justify-center">
            <IconComp className={`h-4 w-4 sm:h-5 sm:w-5 ${currentTheme.iconColor}`} />
          </div>
          <span
            className={`hidden shrink-0 rounded border px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider md:inline-block ${currentTheme.badgeBg}`}
          >
            {currentTheme.badge}
          </span>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
            <span className="font-semibold text-white">{data.title}:</span>
            <span className="opacity-90">{data.message}</span>
          </div>

          {data.linkUrl && (
            <Link
              href={data.linkUrl}
              className="inline-flex shrink-0 items-center gap-0.5 font-medium underline-offset-4 hover:underline text-primary"
            >
              <span>{data.linkText || "Detaylar"}</span>
              <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          )}
        </div>

        <button
          onClick={handleDismiss}
          aria-label="Duyuruyu kapat"
          className="shrink-0 rounded p-1 opacity-70 transition hover:bg-white/10 hover:opacity-100 focus:outline-none"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}

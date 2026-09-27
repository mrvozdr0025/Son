"use client"

import { useEffect, useState } from "react"
import { CheckCircle2, Circle, BookOpen, Clock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { markTopicRead, toggleTopicRead } from "@/app/actions/reading-progress"

interface Props {
  topicId: number
  title: string
  content: string
  initialIsRead?: boolean
}

export function ReadingProgressBar({ topicId, title, content, initialIsRead = false }: Props) {
  const [progress, setProgress] = useState(0)
  const [isRead, setIsRead] = useState(initialIsRead)
  const [showStickyHeader, setShowStickyHeader] = useState(false)

  // Calculate estimated reading time (~180 words per minute)
  const wordCount = content.trim().split(/\s+/).length
  const readMinutes = Math.max(1, Math.ceil(wordCount / 180))

  useEffect(() => {
    // Check localStorage
    try {
      const stored = localStorage.getItem("neon_read_topics")
      if (stored) {
        const ids = JSON.parse(stored) as number[]
        if (ids.includes(topicId)) {
          setIsRead(true)
        }
      }
    } catch {}

    const handleScroll = () => {
      const docHeight = document.documentElement.scrollHeight - window.innerHeight
      if (docHeight <= 0) {
        setProgress(100)
        return
      }

      const scrolled = (window.scrollY / docHeight) * 100
      const clamped = Math.min(100, Math.max(0, scrolled))
      setProgress(clamped)

      setShowStickyHeader(window.scrollY > 250)

      // Auto mark read if user scrolls > 75%
      if (clamped >= 75) {
        markAsRead()
      }
    }

    const markAsRead = () => {
      setIsRead((prev) => {
        if (prev) return prev
        try {
          const stored = localStorage.getItem("neon_read_topics")
          const ids: number[] = stored ? JSON.parse(stored) : []
          if (!ids.includes(topicId)) {
            ids.push(topicId)
            localStorage.setItem("neon_read_topics", JSON.stringify(ids))
            window.dispatchEvent(
              new CustomEvent("topic-read-change", { detail: { topicId, isRead: true } })
            )
          }
        } catch {}
        markTopicRead(topicId).catch(() => {})
        return true
      })
    }

    const timer = setTimeout(() => {
      if (window.scrollY > 100) {
        markAsRead()
      }
    }, 15000)

    window.addEventListener("scroll", handleScroll, { passive: true })
    handleScroll()

    return () => {
      window.removeEventListener("scroll", handleScroll)
      clearTimeout(timer)
    }
  }, [topicId])

  const handleToggle = async () => {
    const next = !isRead
    setIsRead(next)

    try {
      const stored = localStorage.getItem("neon_read_topics")
      let ids: number[] = stored ? JSON.parse(stored) : []
      if (next) {
        if (!ids.includes(topicId)) ids.push(topicId)
      } else {
        ids = ids.filter((id) => id !== topicId)
      }
      localStorage.setItem("neon_read_topics", JSON.stringify(ids))
      window.dispatchEvent(
        new CustomEvent("topic-read-change", { detail: { topicId, isRead: next } })
      )
    } catch {}

    await toggleTopicRead(topicId).catch(() => {})
  }

  return (
    <>
      {/* Top Fixed Progress Bar Line */}
      <div className="fixed top-0 left-0 right-0 z-50 h-1 bg-border/40 pointer-events-none">
        <div
          className="h-full bg-gradient-to-r from-primary via-cyan-400 to-indigo-500 transition-all duration-150 ease-out shadow-[0_0_12px_rgba(34,211,238,0.7)]"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Sticky Reader Banner when scrolled past hero */}
      {showStickyHeader && (
        <div className="fixed top-0 left-0 right-0 z-40 bg-card/90 backdrop-blur-md border-b border-border/80 px-4 py-2.5 transition-all duration-200 animate-in fade-in slide-in-from-top-2">
          <div className="mx-auto max-w-3xl flex items-center justify-between gap-4">
            <div className="min-w-0 flex items-center gap-2.5">
              <BookOpen className="size-4 text-primary shrink-0" />
              <span className="font-semibold text-xs sm:text-sm text-foreground truncate">
                {title}
              </span>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <span className="hidden sm:inline-flex items-center gap-1 text-xs text-muted-foreground font-mono">
                <Clock className="size-3" /> %{Math.round(progress)}
              </span>

              <Button
                variant={isRead ? "secondary" : "outline"}
                size="sm"
                onClick={handleToggle}
                className={`text-xs h-7 px-2.5 gap-1.5 transition-colors ${
                  isRead ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/30" : ""
                }`}
              >
                {isRead ? (
                  <>
                    <CheckCircle2 className="size-3.5 text-emerald-400" />
                    <span>Okundu</span>
                  </>
                ) : (
                  <>
                    <Circle className="size-3.5 text-muted-foreground" />
                    <span className="hidden sm:inline">Okunmadı</span>
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* In-page Progress Indicator and manual toggle */}
      <div className="flex items-center justify-between py-2 px-3 my-3 rounded-xl bg-muted/40 border border-border/60 text-xs text-muted-foreground">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 font-medium text-foreground">
            <Clock className="size-3.5 text-primary" />
            Yaklaşık {readMinutes} dk okuma
          </span>
          <span className="hidden sm:inline">•</span>
          <span className="hidden sm:inline font-mono">İlerleme: %{Math.round(progress)}</span>
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={handleToggle}
          className={`h-7 px-2.5 text-xs font-medium gap-1.5 ${
            isRead ? "text-emerald-400 hover:text-emerald-300" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {isRead ? (
            <>
              <CheckCircle2 className="size-3.5 text-emerald-400" />
              <span>Okundu</span>
            </>
          ) : (
            <>
              <Circle className="size-3.5 text-muted-foreground" />
              <span>Okundu İşaretle</span>
            </>
          )}
        </Button>
      </div>
    </>
  )
}

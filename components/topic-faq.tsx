"use client"

import { useState } from "react"
import {
  Bot,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  FileText,
  HelpCircle,
  RefreshCw,
  Sparkles,
} from "lucide-react"
import { type FaqItem, type TopicSummaryData } from "@/lib/seo"
import { refreshTopicFaqAction } from "@/app/actions/topic-faq"
import { Button } from "@/components/ui/button"

interface TopicFaqProps {
  faqs: FaqItem[]
  summary?: TopicSummaryData
  isAI?: boolean
  topicSlug?: string
  canRefresh?: boolean
}

export function TopicFaq({
  faqs,
  summary,
  isAI = true,
  topicSlug,
  canRefresh = false,
}: TopicFaqProps) {
  const [openIndices, setOpenIndices] = useState<number[]>([0])
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [refreshSuccess, setRefreshSuccess] = useState(false)

  if ((!faqs || faqs.length === 0) && !summary) return null

  const toggle = (index: number) => {
    setOpenIndices((prev) =>
      prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index]
    )
  }

  const handleRefresh = async () => {
    if (!topicSlug || isRefreshing) return
    setIsRefreshing(true)
    setRefreshSuccess(false)
    try {
      const res = await refreshTopicFaqAction(topicSlug)
      if (res.success) {
        setRefreshSuccess(true)
        setTimeout(() => setRefreshSuccess(false), 3000)
      }
    } finally {
      setIsRefreshing(false)
    }
  }

  return (
    <section
      aria-label="Yapay Zeka Destekli Konu Özeti ve Sıkça Sorulan Sorular"
      className="mt-6 space-y-4 rounded-2xl border border-primary/25 bg-card/70 p-4 sm:p-6 shadow-sm backdrop-blur-sm relative overflow-hidden"
    >
      {/* Decorative ambient gradient */}
      <div
        className="absolute -right-16 -top-16 size-48 rounded-full bg-primary/10 blur-3xl pointer-events-none"
        aria-hidden="true"
      />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-3 relative z-10">
        <div className="flex items-center gap-2.5">
          <div className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 via-primary/10 to-primary/5 text-primary border border-primary/30 shadow-sm">
            <Sparkles className="size-4.5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-sm sm:text-base font-bold text-foreground">
                Sıkça Sorulan Sorular & Konu Özeti
              </h2>
              <span className="inline-flex items-center gap-1 rounded-full border border-primary/40 bg-primary/15 px-2.5 py-0.5 text-[10px] font-semibold text-primary">
                <Bot className="size-3" />
                {isAI ? "AI Destekli SEO" : "SEO FAQ"}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Yapay zeka tarafından üretilen arama motoru ve kullanıcı odaklı sentez
            </p>
          </div>
        </div>

        {/* Refresh button if available */}
        {topicSlug && canRefresh && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="h-8 px-2.5 text-xs gap-1.5 text-muted-foreground hover:text-foreground hover:bg-muted self-start sm:self-center"
            title="Yapay zeka ile konu özetini ve soruları yeniden üret"
          >
            <RefreshCw className={`size-3.5 ${isRefreshing ? "animate-spin text-primary" : ""}`} />
            <span>{isRefreshing ? "Analiz Ediliyor..." : refreshSuccess ? "Yenilendi!" : "AI ile Yenile"}</span>
          </Button>
        )}
      </div>

      {/* Konu Özeti & Temel Çıkarımlar */}
      {summary && (
        <div className="rounded-xl border border-primary/25 bg-gradient-to-br from-primary/10 via-primary/5 to-card/60 p-4 space-y-3 relative z-10">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 text-xs font-bold text-primary">
              <FileText className="size-3.5" />
              <span>Yapay Zeka Konu Özeti</span>
            </div>
            <span className="text-[10px] text-muted-foreground font-mono">
              SEO Optimized
            </span>
          </div>

          <p className="text-xs sm:text-sm text-foreground/90 leading-relaxed font-medium">
            {summary.overview}
          </p>

          {summary.keyTakeaways && summary.keyTakeaways.length > 0 && (
            <div className="space-y-1.5 pt-2 border-t border-primary/15">
              <span className="text-[11px] font-semibold text-primary/80 uppercase tracking-wider">
                Öne Çıkan Temel Bulgular:
              </span>
              <ul className="space-y-1.5 text-xs text-foreground/85">
                {summary.keyTakeaways.map((takeaway, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <CheckCircle2 className="size-3.5 text-emerald-400 mt-0.5 shrink-0" />
                    <span className="leading-snug">{takeaway}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* FAQ Accordion */}
      {faqs && faqs.length > 0 && (
        <div className="space-y-2 pt-1 relative z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
              <HelpCircle className="size-3.5 text-primary" />
              <span>Sıkça Sorulan Sorular (SEO FAQ Schema)</span>
            </div>
            <span className="text-[11px] text-muted-foreground font-mono">
              {faqs.length} Soru
            </span>
          </div>

          <div className="divide-y divide-border/60 rounded-xl border border-border/80 bg-background/60 px-3.5 shadow-xs">
            {faqs.map((faq, index) => {
              const isOpen = openIndices.includes(index)
              return (
                <div key={index} className="py-3 first:pt-2.5 last:pb-2.5">
                  <button
                    type="button"
                    onClick={() => toggle(index)}
                    className="flex w-full items-center justify-between text-left text-xs sm:text-sm font-semibold text-foreground hover:text-primary transition-colors py-0.5 cursor-pointer"
                    aria-expanded={isOpen}
                  >
                    <span className="pr-2">{faq.question}</span>
                    {isOpen ? (
                      <ChevronUp className="size-4 shrink-0 text-primary" />
                    ) : (
                      <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
                    )}
                  </button>
                  {isOpen && (
                    <div className="mt-2 text-xs sm:text-[13px] text-muted-foreground leading-relaxed pl-1 pt-1 border-t border-border/30">
                      {faq.answer}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </section>
  )
}

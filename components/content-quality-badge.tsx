"use client"

import { useState } from "react"
import { CheckCircle2, ChevronDown, ChevronUp, Gauge, Info, Lightbulb, Sparkles } from "lucide-react"
import { type ContentQualityReport } from "@/lib/seo"

interface ContentQualityBadgeProps {
  report: ContentQualityReport
}

export function ContentQualityBadge({ report }: ContentQualityBadgeProps) {
  const [expanded, setExpanded] = useState(false)

  // Color scheme based on grade
  const gradeColors = {
    "A+": "text-emerald-500 bg-emerald-500/10 border-emerald-500/30",
    A: "text-emerald-500 bg-emerald-500/10 border-emerald-500/30",
    B: "text-cyan-500 bg-cyan-500/10 border-cyan-500/30",
    C: "text-amber-500 bg-amber-500/10 border-amber-500/30",
    D: "text-rose-500 bg-rose-500/10 border-rose-500/30",
  }[report.grade]

  return (
    <div className="relative inline-block text-left">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold transition-all hover:opacity-90 ${gradeColors}`}
        title="SEO ve İçerik Kalite Skoru"
      >
        <Gauge className="size-3.5" />
        <span>SEO Skor: {report.score}/100</span>
        <span className="font-mono text-[10px] uppercase font-bold opacity-80">({report.grade})</span>
        {expanded ? (
          <ChevronUp className="size-3 opacity-70" />
        ) : (
          <ChevronDown className="size-3 opacity-70" />
        )}
      </button>

      {expanded && (
        <div className="absolute right-0 sm:left-0 z-30 mt-2 w-72 sm:w-80 rounded-xl border border-border bg-popover p-4 text-popover-foreground shadow-xl backdrop-blur-md animate-in fade-in zoom-in-95">
          <div className="flex items-center justify-between border-b border-border/60 pb-2 mb-3">
            <div className="flex items-center gap-1.5">
              <Sparkles className="size-4 text-primary" />
              <span className="text-xs font-bold text-foreground">İçerik Kalite & SEO Analizi</span>
            </div>
            <span className="text-[11px] font-mono font-medium text-muted-foreground">
              {report.wordCount} kelime · ~{report.readTimeMinutes} dk
            </span>
          </div>

          <div className="space-y-2 mb-3">
            {Object.entries(report.criteria).map(([key, item]) => (
              <div key={key} className="space-y-1">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="flex items-center gap-1 text-muted-foreground">
                    <CheckCircle2
                      className={`size-3 ${
                        item.passed ? "text-emerald-500" : "text-muted-foreground/40"
                      }`}
                    />
                    {item.label}
                  </span>
                  <span className="font-mono font-medium">
                    {item.score}/{item.max}
                  </span>
                </div>
                <div className="h-1 w-full rounded-full bg-secondary overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      item.score >= 20
                        ? "bg-emerald-500"
                        : item.score >= 15
                        ? "bg-cyan-500"
                        : "bg-amber-500"
                    }`}
                    style={{ width: `${(item.score / item.max) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          {report.tips.length > 0 && (
            <div className="rounded-lg bg-secondary/50 p-2.5 text-[11px] space-y-1">
              <div className="flex items-center gap-1 font-semibold text-foreground">
                <Lightbulb className="size-3 text-amber-500" />
                <span>SEO Önerileri</span>
              </div>
              <ul className="list-disc pl-4 text-muted-foreground space-y-0.5">
                {report.tips.map((tip, idx) => (
                  <li key={idx}>{tip}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="mt-2 text-[10px] text-muted-foreground/80 flex items-center gap-1">
            <Info className="size-3 shrink-0" />
            <span>Google & arama motorları için yapılandırılmış veri hazır.</span>
          </div>
        </div>
      )}
    </div>
  )
}

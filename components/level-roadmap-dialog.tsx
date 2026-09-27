"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { LEVEL_TIERS, getLevelProgressInfo } from "@/lib/level-tiers"
import {
  Sparkles,
  Shield,
  Award,
  Crown,
  Zap,
  Cpu,
  Compass,
  BookOpen,
  MapPin,
  Brain,
  CheckCircle2,
  ChevronRight,
  TrendingUp,
  MessageSquare,
  FileText,
  ThumbsUp,
  Trophy,
} from "lucide-react"

const ICONS: Record<string, any> = {
  Sparkles,
  BookOpen,
  Compass,
  MapPin,
  Shield,
  Award,
  Cpu,
  Brain,
  Crown,
  Zap,
}

export function LevelRoadmapDialog({
  userXp = 0,
  userLevel = 1,
  trigger,
}: {
  userXp?: number
  userLevel?: number
  trigger?: React.ReactNode
}) {
  const [open, setOpen] = useState(false)
  const progressInfo = getLevelProgressInfo(userXp, userLevel)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger className="inline-flex">
        {trigger ?? (
          <Button variant="outline" size="sm" className="gap-1.5 bg-background/50 text-xs">
            <TrendingUp className="size-3.5 text-primary" /> Seviye Yol Haritası
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-bold">
            <Trophy className="size-5 text-yellow-400" /> Seviye ve Unvan Sistemi
          </DialogTitle>
          <DialogDescription>
            Foruma katkı sağladıkça, mesaj yazdıkça, beğeni aldıkça ve çözümler ürettikçe seviye atla,
            özel unvanlar ve ayrıcalıklar kazan.
          </DialogDescription>
        </DialogHeader>

        {/* Current User Level Progress Card */}
        <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 mt-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <span className="text-xs uppercase font-mono tracking-wider text-muted-foreground">
                Mevcut Durumun
              </span>
              <div className="flex items-center gap-2 mt-0.5">
                <span
                  className="font-bold text-lg"
                  style={{ color: progressInfo.currentTier.badgeColor }}
                >
                  Seviye {progressInfo.currentTier.level}: {progressInfo.currentTier.title}
                </span>
                <span className="text-xs text-muted-foreground font-mono">
                  ({progressInfo.currentXp} XP)
                </span>
              </div>
            </div>

            {!progressInfo.isMaxLevel && progressInfo.nextTier && (
              <div className="text-right">
                <span className="text-xs text-muted-foreground">Sonraki Seviye</span>
                <p className="text-xs font-semibold text-foreground">
                  {progressInfo.nextTier.title} ({progressInfo.xpRemaining} XP kaldı)
                </p>
              </div>
            )}
          </div>

          <div className="mt-3">
            <div className="flex justify-between text-xs font-mono text-muted-foreground mb-1">
              <span>{progressInfo.tierMinXp} XP</span>
              <span className="font-semibold text-primary">%{progressInfo.progressPercent}</span>
              <span>{progressInfo.isMaxLevel ? "Maksimum" : `${progressInfo.tierMaxXp} XP`}</span>
            </div>
            <Progress value={progressInfo.progressPercent} className="h-2" />
          </div>
        </div>

        {/* XP Earning Guide */}
        <div className="mt-2 grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
          <div className="flex items-center gap-2 rounded-lg border border-border bg-card/40 p-2">
            <MessageSquare className="size-4 text-sky-400 shrink-0" />
            <div>
              <p className="font-medium text-foreground">Yorum Yap</p>
              <p className="text-muted-foreground font-mono">+5 XP</p>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-lg border border-border bg-card/40 p-2">
            <FileText className="size-4 text-emerald-400 shrink-0" />
            <div>
              <p className="font-medium text-foreground">Konu Aç</p>
              <p className="text-muted-foreground font-mono">+15 XP</p>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-lg border border-border bg-card/40 p-2">
            <ThumbsUp className="size-4 text-amber-400 shrink-0" />
            <div>
              <p className="font-medium text-foreground">Beğeni Al</p>
              <p className="text-muted-foreground font-mono">+3 XP</p>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-lg border border-border bg-card/40 p-2">
            <CheckCircle2 className="size-4 text-green-400 shrink-0" />
            <div>
              <p className="font-medium text-foreground">En İyi Cevap</p>
              <p className="text-muted-foreground font-mono">+25 XP</p>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-lg border border-border bg-card/40 p-2">
            <Trophy className="size-4 text-purple-400 shrink-0" />
            <div>
              <p className="font-medium text-foreground">Haftalık Görev</p>
              <p className="text-muted-foreground font-mono">+20 XP</p>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-lg border border-border bg-card/40 p-2">
            <Zap className="size-4 text-rose-400 shrink-0" />
            <div>
              <p className="font-medium text-foreground">Günlük Seri</p>
              <p className="text-muted-foreground font-mono">+5 XP/gün</p>
            </div>
          </div>
        </div>

        {/* Tiers List */}
        <div className="mt-3 flex flex-col gap-2.5">
          <h3 className="text-xs uppercase font-mono tracking-wider text-muted-foreground">
            Tüm Seviye ve Unvan Kademeleri
          </h3>
          {LEVEL_TIERS.map((tier) => {
            const IconComp = ICONS[tier.icon] ?? Sparkles
            const isCurrent = tier.level === progressInfo.currentTier.level
            const isUnlocked = tier.level <= progressInfo.currentTier.level

            return (
              <div
                key={tier.level}
                className={`relative flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border p-3 transition-all ${
                  isCurrent
                    ? "border-primary bg-primary/10 shadow-sm"
                    : isUnlocked
                      ? "border-border/80 bg-card/40"
                      : "border-border/40 bg-card/20 opacity-70"
                }`}
              >
                <div className="flex items-start sm:items-center gap-3">
                  <div
                    className="size-9 rounded-lg flex items-center justify-center shrink-0 border"
                    style={{
                      backgroundColor: tier.bgGlow,
                      borderColor: `${tier.badgeColor}50`,
                      color: tier.badgeColor,
                    }}
                  >
                    <IconComp className="size-5" />
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold" style={{ color: tier.badgeColor }}>
                        Sv.{tier.level}
                      </span>
                      <h4 className="font-semibold text-sm text-foreground">{tier.title}</h4>
                      {isCurrent && (
                        <span className="rounded-full bg-primary/20 px-2 py-0.2 text-[10px] font-bold text-primary">
                          Sen Buradasın
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{tier.description}</p>
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      {tier.perks.map((perk, i) => (
                        <span
                          key={i}
                          className="inline-flex items-center text-[10px] text-muted-foreground/90 bg-muted/60 px-1.5 py-0.5 rounded"
                        >
                          • {perk}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="sm:text-right shrink-0">
                  <span className="font-mono text-xs font-medium text-muted-foreground">
                    {tier.minXp} {tier.maxXp === 999999 ? "+ XP" : `- ${tier.maxXp} XP`}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      </DialogContent>
    </Dialog>
  )
}

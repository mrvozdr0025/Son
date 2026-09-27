"use client"

import { useState, useTransition } from "react"
import { updateBadgeShowcase } from "@/app/actions/badges"
import { Button } from "@/components/ui/button"
import {
  Award,
  Check,
  Flame,
  MessageSquare,
  Sparkles,
  Trophy,
  Zap,
  Edit3,
  X,
} from "lucide-react"

export type BadgeItem = {
  id: number
  name: string
  slug: string
  description: string
  icon: string
  color: string
}

function getBadgeIcon(slug: string, icon: string, color: string) {
  const props = { className: "size-5 shrink-0", style: { color } }
  if (slug.includes("konu") || slug.includes("yazar")) return <Edit3 {...props} />
  if (slug.includes("yorum") || slug.includes("sohbet")) return <MessageSquare {...props} />
  if (slug.includes("ates") || slug.includes("seri")) return <Flame {...props} />
  if (slug.includes("usta") || slug.includes("lider")) return <Trophy {...props} />
  if (slug.includes("gece") || slug.includes("hizli")) return <Zap {...props} />
  return <Award {...props} />
}

export function BadgeShowcase({
  allBadges,
  initialFeaturedIds = [],
  isOwner,
}: {
  allBadges: BadgeItem[]
  initialFeaturedIds: number[]
  isOwner: boolean
}) {
  const [featuredIds, setFeaturedIds] = useState<number[]>(initialFeaturedIds)
  const [isEditing, setIsEditing] = useState(false)
  const [selectedIds, setSelectedIds] = useState<number[]>(initialFeaturedIds)
  const [pending, startTransition] = useTransition()

  const featuredBadges = featuredIds
    .map((id) => allBadges.find((b) => b.id === id))
    .filter(Boolean) as BadgeItem[]

  function toggleSelect(id: number) {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((x) => x !== id))
    } else {
      if (selectedIds.length >= 5) return // Max 5 badges
      setSelectedIds([...selectedIds, id])
    }
  }

  function handleSave() {
    startTransition(async () => {
      try {
        await updateBadgeShowcase(selectedIds)
        setFeaturedIds(selectedIds)
        setIsEditing(false)
      } catch (err) {
        console.error("Vitrini güncelleme hatası:", err)
      }
    })
  }

  if (allBadges.length === 0 && !isOwner) {
    return null
  }

  return (
    <section className="mt-4 rounded-xl border border-border/80 bg-card/60 p-4 backdrop-blur-sm">
      <div className="flex items-center justify-between gap-2 border-b border-border/60 pb-3">
        <div className="flex items-center gap-2">
          <Sparkles className="size-4 text-amber-400" />
          <h2 className="text-sm font-bold text-foreground">Rozet Vitrini</h2>
          <span className="rounded-full bg-secondary px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
            {featuredBadges.length}/5 Öne Çıkarılan
          </span>
        </div>
        {isOwner && allBadges.length > 0 && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              setSelectedIds(featuredIds)
              setIsEditing(true)
            }}
            className="h-7 gap-1 px-2.5 text-xs text-muted-foreground hover:text-foreground"
          >
            <Edit3 className="size-3" />
            Vitrini Düzenle
          </Button>
        )}
      </div>

      {featuredBadges.length > 0 ? (
        <div className="mt-3.5 grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
          {featuredBadges.map((badge) => (
            <div
              key={badge.id}
              className="group relative flex items-start gap-3 rounded-lg border border-border/80 bg-background/80 p-3 shadow-xs transition-all hover:border-primary/50 hover:shadow-md"
              style={{
                borderColor: `${badge.color}35`,
              }}
            >
              <div
                className="flex size-10 shrink-0 items-center justify-center rounded-lg"
                style={{
                  backgroundColor: `${badge.color}15`,
                  border: `1px solid ${badge.color}35`,
                }}
              >
                {getBadgeIcon(badge.slug, badge.icon, badge.color)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <h3 className="truncate text-xs font-bold text-foreground" style={{ color: badge.color }}>
                    {badge.name}
                  </h3>
                </div>
                <p className="mt-0.5 line-clamp-2 text-[11px] leading-relaxed text-muted-foreground">
                  {badge.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      ) : isOwner ? (
        <div className="py-6 text-center">
          <Award className="mx-auto size-8 text-muted-foreground/60" />
          <p className="mt-2 text-xs text-muted-foreground">
            Henüz rozet vitrinin boş. Kazandığın rozetlerden en sevdiklerini seç ve profilinde öne çıkar!
          </p>
          {allBadges.length > 0 && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => {
                setSelectedIds(featuredIds)
                setIsEditing(true)
              }}
              className="mt-3 text-xs"
            >
              <Sparkles className="size-3.5 text-amber-400" />
              Vitrine Rozet Ekle
            </Button>
          )}
        </div>
      ) : (
        <p className="py-4 text-center text-xs text-muted-foreground">
          Kullanıcı henüz rozet vitrinini düzenlememiş.
        </p>
      )}

      {/* Showcase Editor Modal */}
      {isEditing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-xl border border-border bg-card p-5 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <h3 className="text-base font-bold text-foreground">Rozet Vitrinini Düzenle</h3>
                <p className="text-xs text-muted-foreground">
                  Profilinde öne çıkarılacak en fazla 5 rozeti seç ({selectedIds.length}/5)
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="mt-3.5 max-h-72 overflow-y-auto space-y-2 pr-1">
              {allBadges.map((badge) => {
                const isSelected = selectedIds.includes(badge.id)
                const isDisabled = !isSelected && selectedIds.length >= 5
                return (
                  <button
                    key={badge.id}
                    type="button"
                    onClick={() => toggleSelect(badge.id)}
                    disabled={isDisabled}
                    className={`flex w-full items-center gap-3 rounded-lg border p-2.5 text-left text-xs transition-colors ${
                      isSelected
                        ? "border-primary bg-primary/10 shadow-xs"
                        : isDisabled
                        ? "opacity-40 cursor-not-allowed border-border bg-background/50"
                        : "border-border bg-background hover:border-border hover:bg-muted/60"
                    }`}
                  >
                    <div
                      className="flex size-8 shrink-0 items-center justify-center rounded-md"
                      style={{ backgroundColor: `${badge.color}20` }}
                    >
                      {getBadgeIcon(badge.slug, badge.icon, badge.color)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-foreground">{badge.name}</div>
                      <div className="truncate text-[11px] text-muted-foreground">{badge.description}</div>
                    </div>
                    <div
                      className={`flex size-5 shrink-0 items-center justify-center rounded-md border ${
                        isSelected ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground/40"
                      }`}
                    >
                      {isSelected && <Check className="size-3" />}
                    </div>
                  </button>
                )
              })}
            </div>

            <div className="mt-5 flex items-center justify-end gap-2 border-t border-border pt-3">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setIsEditing(false)}
                disabled={pending}
              >
                Vazgeç
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={handleSave}
                disabled={pending}
                className="gap-1.5"
              >
                <Check className="size-3.5" />
                Vitrini Kaydet
              </Button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}

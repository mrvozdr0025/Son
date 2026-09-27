"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { setProfileTheme } from "@/app/actions/theme"
import type { ProfileTheme } from "@/lib/gamification"
import { Check, Lock } from "lucide-react"

// Karma-gated profile theme selector, shown only to the profile owner.
export function ThemePicker({
  themes,
  currentThemeId,
  karma,
}: {
  themes: ProfileTheme[]
  currentThemeId: string
  karma: number
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function select(theme: ProfileTheme) {
    if (karma < theme.minKarma || pending) return
    setError(null)
    startTransition(async () => {
      try {
        await setProfileTheme(theme.id)
        router.refresh()
      } catch (e) {
        setError(e instanceof Error ? e.message : "Tema değiştirilemedi")
      }
    })
  }

  return (
    <div className="mt-4">
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-300">
        Profil Teması <span className="normal-case text-slate-400 font-normal">(karma ile açılır)</span>
      </h3>
      <div className="flex flex-wrap gap-2">
        {themes.map((t) => {
          const locked = karma < t.minKarma
          const active = t.id === currentThemeId
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => select(t)}
              disabled={locked || pending}
              title={locked ? `${t.minKarma} karma gerekli` : t.name}
              className={`relative flex h-12 w-20 flex-col items-center justify-center rounded-lg border text-[10px] font-medium transition-all ${
                active
                  ? "border-cyan-400 ring-2 ring-cyan-400/50 shadow-md scale-102"
                  : "border-white/20 hover:border-white/40"
              } ${locked ? "cursor-not-allowed opacity-50" : "hover:scale-105"}`}
              style={{ background: t.gradient, color: t.accent }}
            >
              {locked ? <Lock className="size-3" /> : active ? <Check className="size-3" /> : null}
              <span className="mt-0.5 font-semibold">{t.name}</span>
              {locked && <span className="text-[9px] opacity-80">{t.minKarma}+ karma</span>}
            </button>
          )
        })}
      </div>
      {error && <p className="mt-2 text-xs text-rose-400 font-medium">{error}</p>}
    </div>
  )
}

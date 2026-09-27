"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import Link from "next/link"
import { useTheme } from "@/components/theme-provider"
import type { ThemeMode } from "@/app/actions/theme-settings"
import { Moon, Sun, Laptop, Check, Settings2, Sparkles } from "lucide-react"

export function ThemeToggle({ className = "" }: { className?: string }) {
  const { themeMode, resolvedTheme, systemTheme, setThemeMode, toggleTheme } = useTheme()
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // Close dropdown on click outside or escape key
  useEffect(() => {
    if (!isOpen) return

    function handleClickOutside(event: MouseEvent | TouchEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    document.addEventListener("touchstart", handleClickOutside, { passive: true })
    document.addEventListener("keydown", handleKeyDown)

    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
      document.removeEventListener("touchstart", handleClickOutside)
      document.removeEventListener("keydown", handleKeyDown)
    }
  }, [isOpen])

  const handleSelectMode = useCallback(
    async (mode: ThemeMode) => {
      try {
        await setThemeMode(mode)
      } catch (err) {
        console.warn("[theme-toggle] Error updating theme mode:", err)
      } finally {
        setIsOpen(false)
      }
    },
    [setThemeMode]
  )

  const handleQuickToggle = useCallback(
    async (e: React.MouseEvent) => {
      e.stopPropagation()
      try {
        toggleTheme()
      } catch (err) {
        console.warn("[theme-toggle] Quick toggle error:", err)
      }
    },
    [toggleTheme]
  )

  const tooltipTitle =
    themeMode === "system"
      ? `Tema: Sistem (${resolvedTheme === "dark" ? "Karanlık" : "Aydınlık"})`
      : themeMode === "dark"
      ? "Tema: Karanlık"
      : "Tema: Aydınlık"

  return (
    <div ref={containerRef} className="relative inline-block text-left">
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-label="Tema Seçimi ve Değiştirme"
        aria-expanded={isOpen}
        aria-haspopup="true"
        title={tooltipTitle}
        className={`relative inline-flex items-center justify-center size-9 rounded-xl transition-all duration-200 border border-transparent hover:border-border/70 hover:bg-muted/80 text-muted-foreground hover:text-foreground outline-none focus-visible:ring-2 focus-visible:ring-primary cursor-pointer active:scale-95 ${className}`}
      >
        {themeMode === "system" ? (
          <Laptop className="size-4.5 text-primary transition-transform duration-200 hover:scale-110" />
        ) : themeMode === "dark" ? (
          <Moon className="size-4.5 text-cyan-400 transition-transform duration-200 hover:-rotate-12 hover:scale-110" />
        ) : (
          <Sun className="size-4.5 text-amber-500 transition-transform duration-200 hover:rotate-45 hover:scale-110" />
        )}
      </button>

      {/* Self-contained popup dropdown */}
      {isOpen && (
        <div
          role="menu"
          aria-label="Tema Seçimi"
          className="absolute right-0 top-full mt-2 w-52 origin-top-right rounded-2xl border border-border/80 bg-popover/95 p-1.5 text-popover-foreground shadow-2xl backdrop-blur-xl ring-1 ring-black/10 z-50 animate-in fade-in-0 zoom-in-95 duration-150"
        >
          <div className="flex items-center justify-between px-2.5 py-1.5 border-b border-border/50 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Tema Tercihi
            </span>
            <button
              type="button"
              onClick={handleQuickToggle}
              className="text-[10px] text-primary hover:underline font-semibold flex items-center gap-1 cursor-pointer"
              title="Hızlıca Karanlık/Aydınlık arasında geçiş yap"
            >
              <Sparkles className="size-3" />
              <span>Hızlı Değiştir</span>
            </button>
          </div>

          <div className="space-y-0.5">
            <button
              type="button"
              role="menuitem"
              onClick={() => handleSelectMode("light")}
              className={`w-full flex items-center justify-between px-2.5 py-2 text-xs font-medium rounded-lg transition-colors cursor-pointer text-left ${
                themeMode === "light"
                  ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 font-semibold"
                  : "hover:bg-muted/80 text-foreground"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Sun className="size-4 text-amber-500 shrink-0" />
                <span>Aydınlık Mod</span>
              </div>
              {themeMode === "light" && <Check className="size-3.5 text-amber-500 shrink-0" />}
            </button>

            <button
              type="button"
              role="menuitem"
              onClick={() => handleSelectMode("dark")}
              className={`w-full flex items-center justify-between px-2.5 py-2 text-xs font-medium rounded-lg transition-colors cursor-pointer text-left ${
                themeMode === "dark"
                  ? "bg-cyan-500/10 text-cyan-500 dark:text-cyan-400 font-semibold"
                  : "hover:bg-muted/80 text-foreground"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Moon className="size-4 text-cyan-400 shrink-0" />
                <span>Karanlık Mod</span>
              </div>
              {themeMode === "dark" && <Check className="size-3.5 text-cyan-400 shrink-0" />}
            </button>

            <button
              type="button"
              role="menuitem"
              onClick={() => handleSelectMode("system")}
              className={`w-full flex items-center justify-between px-2.5 py-2 text-xs font-medium rounded-lg transition-colors cursor-pointer text-left ${
                themeMode === "system"
                  ? "bg-primary/10 text-primary font-semibold"
                  : "hover:bg-muted/80 text-foreground"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Laptop className="size-4 text-primary shrink-0" />
                <div className="flex flex-col">
                  <span>Sistem Tercihi</span>
                  <span className="text-[10px] text-muted-foreground font-normal">
                    {systemTheme === "dark" ? "Şu an: Karanlık" : "Şu an: Aydınlık"}
                  </span>
                </div>
              </div>
              {themeMode === "system" && <Check className="size-3.5 text-primary shrink-0" />}
            </button>
          </div>

          <div className="mt-1 pt-1 border-t border-border/50">
            <Link
              href="/ayarlar/tema"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-2 px-2.5 py-1.5 text-[11px] font-medium text-muted-foreground hover:text-foreground hover:bg-muted/60 rounded-md transition-colors"
            >
              <Settings2 className="size-3.5" />
              <span>Gelişmiş Görünüm Ayarları</span>
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}


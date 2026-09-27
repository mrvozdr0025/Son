"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Command, CornerDownLeft, Search, PlusCircle, Home, Trophy, Bell, MessageSquare, X, Keyboard } from "lucide-react"
import { Button } from "@/components/ui/button"

export function KeyboardShortcutsDialog() {
  const [isOpen, setIsOpen] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeElement = document.activeElement
      const isInput =
        activeElement instanceof HTMLInputElement ||
        activeElement instanceof HTMLTextAreaElement ||
        activeElement instanceof HTMLSelectElement ||
        (activeElement as HTMLElement)?.isContentEditable

      if (isInput) return

      if (e.key === "?" || (e.shiftKey && e.key === "/")) {
        e.preventDefault()
        setIsOpen((prev) => !prev)
        return
      }

      if (e.key === "Escape" && isOpen) {
        e.preventDefault()
        setIsOpen(false)
        return
      }

      if (isOpen) return

      if (e.key === "n" || e.key === "N") {
        e.preventDefault()
        router.push("/yeni-konu")
      } else if (e.key === "/") {
        e.preventDefault()
        const searchInput = document.querySelector<HTMLInputElement>("input[type='search'], input[placeholder*='Ara']")
        if (searchInput) {
          searchInput.focus()
        } else {
          router.push("/ara")
        }
      } else if (e.key === "h" || e.key === "H" || e.key === "t" || e.key === "T") {
        e.preventDefault()
        router.push("/")
      } else if (e.key === "l" || e.key === "L") {
        e.preventDefault()
        router.push("/liderler")
      } else if (e.key === "b" || e.key === "B") {
        e.preventDefault()
        router.push("/bildirimler")
      } else if (e.key === "m" || e.key === "M") {
        e.preventDefault()
        router.push("/mesajlar")
      }
    }

    const handleCustomTrigger = () => setIsOpen(true)
    window.addEventListener("open-keyboard-shortcuts", handleCustomTrigger)
    window.addEventListener("keydown", handleKeyDown)

    return () => {
      window.removeEventListener("open-keyboard-shortcuts", handleCustomTrigger)
      window.removeEventListener("keydown", handleKeyDown)
    }
  }, [router, isOpen])

  if (!isOpen) return null

  const shortcuts = [
    { key: "n", label: "Yeni Konu Başlat", icon: PlusCircle, path: "/yeni-konu" },
    { key: "/", label: "Arama Yap", icon: Search, path: "/ara" },
    { key: "h / t", label: "Ana Sayfa / Akış", icon: Home, path: "/" },
    { key: "l", label: "Liderlik Tablosu", icon: Trophy, path: "/liderler" },
    { key: "b", label: "Bildirimler", icon: Bell, path: "/bildirimler" },
    { key: "m", label: "Özel Mesajlar", icon: MessageSquare, path: "/mesajlar" },
    { key: "?", label: "Kısayolları Göster", icon: Keyboard },
    { key: "Esc", label: "Pencereyi Kapat", icon: X },
  ]

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={() => setIsOpen(false)}
    >
      <div
        className="w-full max-w-md rounded-2xl bg-card border border-border p-5 sm:p-6 shadow-2xl text-card-foreground animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-3.5 mb-4 border-b border-border">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-primary/10 text-primary">
              <Keyboard className="size-5" />
            </div>
            <div>
              <h2 className="font-bold text-base text-foreground">Klavye Kısayolları</h2>
              <p className="text-xs text-muted-foreground">Herhangi bir sayfadayken tuşlayın</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsOpen(false)}
            className="rounded-full size-8"
          >
            <X className="size-4" />
          </Button>
        </div>

        <div className="grid grid-cols-1 gap-2">
          {shortcuts.map((s) => {
            const Icon = s.icon
            return (
              <div
                key={s.key}
                onClick={() => {
                  if (s.path) {
                    setIsOpen(false)
                    router.push(s.path)
                  }
                }}
                className={`flex items-center justify-between p-2.5 rounded-xl border border-border/60 bg-muted/20 transition-colors ${
                  s.path ? "cursor-pointer hover:bg-muted/60 hover:border-primary/40" : ""
                }`}
              >
                <div className="flex items-center gap-2.5 text-xs sm:text-sm text-foreground">
                  <Icon className="size-4 text-muted-foreground" />
                  <span>{s.label}</span>
                </div>
                <kbd className="inline-flex items-center gap-1 font-mono text-xs font-semibold px-2 py-0.5 rounded-md bg-muted border border-border shadow-xs text-foreground">
                  {s.key}
                </kbd>
              </div>
            )
          })}
        </div>

        <div className="mt-4 pt-3 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
          <span>Yazı alanları dışındayken aktiftir</span>
          <Button size="sm" variant="ghost" onClick={() => setIsOpen(false)} className="h-7 text-xs">
            Anladım
          </Button>
        </div>
      </div>
    </div>
  )
}

"use client"

import { Keyboard } from "lucide-react"
import { Button } from "@/components/ui/button"

export function KeyboardShortcutsTrigger({ className = "" }: { className?: string }) {
  const handleClick = () => {
    window.dispatchEvent(new CustomEvent("open-keyboard-shortcuts"))
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={handleClick}
      title="Klavye Kısayolları (?)"
      aria-label="Klavye Kısayolları"
      className={`size-9 rounded-xl border border-transparent hover:border-border/70 hover:bg-muted/80 text-muted-foreground hover:text-foreground ${className}`}
    >
      <Keyboard className="size-4" />
    </Button>
  )
}

"use client"

import { useEffect, useState } from "react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Bot } from "lucide-react"

export type MentionUser = {
  id: number
  username: string
  displayName: string
  avatarUrl: string | null
  isAI?: boolean
}

export function MentionPopover({
  query,
  onSelect,
  onClose,
}: {
  query: string
  onSelect: (username: string) => void
  onClose: () => void
}) {
  const [users, setUsers] = useState<MentionUser[]>([])
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    fetch(`/api/users/mention-search?q=${encodeURIComponent(query)}`)
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled && data.users) {
          setUsers(data.users)
          setSelectedIndex(0)
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [query])

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (users.length === 0) return

      if (e.key === "ArrowDown") {
        e.preventDefault()
        setSelectedIndex((i) => (i + 1) % users.length)
      } else if (e.key === "ArrowUp") {
        e.preventDefault()
        setSelectedIndex((i) => (i - 1 + users.length) % users.length)
      } else if (e.key === "Enter" || e.key === "Tab") {
        if (users[selectedIndex]) {
          e.preventDefault()
          onSelect(users[selectedIndex].username)
        }
      } else if (e.key === "Escape") {
        e.preventDefault()
        onClose()
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [users, selectedIndex, onSelect, onClose])

  if (users.length === 0 && !loading) return null

  return (
    <div className="absolute z-50 mb-1 max-h-56 w-64 overflow-y-auto rounded-lg border border-border bg-popover/95 p-1 shadow-lg backdrop-blur-md">
      <div className="px-2 py-1 text-[11px] font-medium text-muted-foreground">
        Kullanıcıdan bahset (@)
      </div>
      {users.map((u, idx) => (
        <button
          key={u.id}
          type="button"
          onClick={() => onSelect(u.username)}
          className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs transition-colors ${
            idx === selectedIndex ? "bg-accent text-accent-foreground" : "hover:bg-muted"
          }`}
        >
          <Avatar className="size-5 shrink-0">
            <AvatarImage src={u.avatarUrl ?? undefined} alt="" />
            <AvatarFallback className="text-[9px]">{u.displayName.slice(0, 2)}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1 truncate">
            <span className="font-medium text-foreground">{u.displayName}</span>
            <span className="ml-1 font-mono text-[11px] text-muted-foreground">@{u.username}</span>
          </div>
          {u.isAI && (
            <Bot className="size-3 shrink-0 text-cyan-400" />
          )}
        </button>
      ))}
    </div>
  )
}

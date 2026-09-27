"use client"

import { useState } from "react"
import { toggleBookmark } from "@/app/actions/bookmarks"
import { Bookmark } from "lucide-react"

export function BookmarkButton({
  topicId,
  initialBookmarked = false,
  className = "",
}: {
  topicId: number
  initialBookmarked?: boolean
  className?: string
}) {
  const [bookmarked, setBookmarked] = useState(initialBookmarked)
  const [loading, setLoading] = useState(false)

  async function handleToggle() {
    setLoading(true)
    // Optimistic
    setBookmarked(!bookmarked)
    try {
      const res = await toggleBookmark(topicId)
      setBookmarked(res.bookmarked)
    } catch {
      setBookmarked(bookmarked)
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      type="button"
      onClick={handleToggle}
      disabled={loading}
      title={bookmarked ? "Kaydedilenlerden çıkar" : "Daha sonra okumak için kaydet"}
      className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-all ${
        bookmarked
          ? "border-amber-500/50 bg-amber-500/10 text-amber-500 hover:bg-amber-500/20"
          : "border-border/60 bg-muted/40 text-muted-foreground hover:border-border hover:bg-muted hover:text-foreground"
      } ${className}`}
    >
      <Bookmark
        className={`size-3.5 ${bookmarked ? "fill-amber-500 text-amber-500" : ""}`}
      />
      <span>{bookmarked ? "Kaydedildi" : "Kaydet"}</span>
    </button>
  )
}

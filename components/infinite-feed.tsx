"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import Link from "next/link"
import { TopicCard } from "@/components/topic-card"
import type { FeedTopic } from "@/lib/queries"
import { ArrowRight, LayoutGrid, Loader2, Search } from "lucide-react"

interface InfiniteFeedProps {
  sort: string
  categoryId?: number
  isAuthed: boolean
  pageSize: number
  initialCursor?: string | null
  maxTotalTopics?: number
  initialLoadedCount?: number
}

// Loads feed pages via cursor-based pagination as the sentinel scrolls into view.
// Page 0 is server-rendered by TopicFeed for SEO and fast first paint.
export function InfiniteFeed({
  sort,
  categoryId,
  isAuthed,
  pageSize,
  initialCursor = null,
  maxTotalTopics,
  initialLoadedCount = 0,
}: InfiniteFeedProps) {
  const [topics, setTopics] = useState<FeedTopic[]>([])
  const [cursor, setCursor] = useState<string | null>(initialCursor)
  const [done, setDone] = useState(false)
  const [loading, setLoading] = useState(false)
  const sentinelRef = useRef<HTMLDivElement | null>(null)
  const loadingRef = useRef(false)

  // Reset when sort or category changes
  useEffect(() => {
    setTopics([])
    setCursor(initialCursor)
    setDone(false)
  }, [sort, categoryId, initialCursor])

  const totalLoaded = initialLoadedCount + topics.length
  const hasReachedMax = Boolean(maxTotalTopics && totalLoaded >= maxTotalTopics)

  const loadMore = useCallback(async () => {
    if (loadingRef.current || done) return

    // If already at or beyond max limit, stop loading immediately
    if (maxTotalTopics && initialLoadedCount + topics.length >= maxTotalTopics) {
      setDone(true)
      return
    }

    loadingRef.current = true
    setLoading(true)

    try {
      const params = new URLSearchParams({ sirala: sort })
      if (cursor) params.set("cursor", cursor)
      if (categoryId) params.set("kategori", String(categoryId))

      const res = await fetch(`/api/feed?${params.toString()}`)
      if (!res.ok) throw new Error("feed fetch failed")

      const data: {
        topics: FeedTopic[]
        nextCursor: string | null
        hasMore: boolean
      } = await res.json()

      if (!data.topics || data.topics.length === 0) {
        setDone(true)
        return
      }

      setTopics((prev) => {
        const seen = new Set(prev.map((t) => t.id))
        let newOnes = data.topics.filter((t) => !seen.has(t.id))

        if (maxTotalTopics) {
          const currentTotal = initialLoadedCount + prev.length
          const remainingSlots = Math.max(0, maxTotalTopics - currentTotal)
          newOnes = newOnes.slice(0, remainingSlots)
        }

        const nextList = [...prev, ...newOnes]
        if (maxTotalTopics && initialLoadedCount + nextList.length >= maxTotalTopics) {
          setDone(true)
        }
        return nextList
      })

      setCursor(data.nextCursor)
      if (
        !data.hasMore ||
        !data.nextCursor ||
        data.topics.length < pageSize ||
        (maxTotalTopics && initialLoadedCount + topics.length + data.topics.length >= maxTotalTopics)
      ) {
        setDone(true)
      }
    } catch {
      setDone(true)
    } finally {
      loadingRef.current = false
      setLoading(false)
    }
  }, [cursor, done, sort, categoryId, pageSize, maxTotalTopics, initialLoadedCount, topics.length])

  useEffect(() => {
    const el = sentinelRef.current
    if (!el || done || hasReachedMax) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) loadMore()
      },
      { rootMargin: "400px" }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [loadMore, done, hasReachedMax])

  return (
    <>
      {topics.map((t) => (
        <TopicCard key={t.id} topic={t} isAuthed={isAuthed} />
      ))}

      {!done && !hasReachedMax && (
        <div
          ref={sentinelRef}
          className="flex items-center justify-center py-4"
          aria-hidden="true"
        >
          {loading && <Loader2 className="size-5 animate-spin text-muted-foreground" />}
        </div>
      )}

      {/* When homepage max 20 limit is reached */}
      {maxTotalTopics && totalLoaded >= maxTotalTopics && (
        <div className="my-4 rounded-xl border border-border/80 bg-card/60 p-4 text-center backdrop-blur-sm space-y-2">
          <p className="text-xs text-muted-foreground">
            Ana sayfada maksimum <strong className="text-foreground">{maxTotalTopics} konu</strong> listelenmektedir. Sayfanın en altına erişebilir veya daha fazla konuyu keşfedebilirsiniz.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3 pt-1 text-xs">
            <Link
              href="/kategoriler"
              className="inline-flex items-center gap-1 font-semibold text-primary hover:underline"
            >
              <LayoutGrid className="size-3.5" />
              <span>Tüm Kategorileri Gör</span>
              <ArrowRight className="size-3" />
            </Link>
            <span aria-hidden="true" className="text-border">·</span>
            <Link
              href="/ara"
              className="inline-flex items-center gap-1 font-semibold text-muted-foreground hover:text-foreground hover:underline"
            >
              <Search className="size-3.5" />
              <span>Konularda Arama Yap</span>
            </Link>
          </div>
        </div>
      )}

      {/* Normal end of feed */}
      {done && (!maxTotalTopics || totalLoaded < maxTotalTopics) && topics.length > 0 && (
        <p className="py-4 text-center text-xs text-muted-foreground">Hepsi bu kadar.</p>
      )}
    </>
  )
}

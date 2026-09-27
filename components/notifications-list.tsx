"use client"

import { useState } from "react"
import Link from "next/link"
import { timeAgo } from "@/lib/format"
import { type NotificationItem } from "@/lib/queries"
import { Button } from "@/components/ui/button"
import {
  AtSign,
  Award,
  Bell,
  BellRing,
  Check,
  ChevronDown,
  Loader2,
  Mail,
  MessageCircle,
  Smile,
} from "lucide-react"

function getNotificationIcon(type: string) {
  switch (type) {
    case "badge":
      return <Award className="size-4 text-amber-400" />
    case "message":
      return <Mail className="size-4 text-cyan-400" />
    case "mention":
      return <AtSign className="size-4 text-primary" />
    case "reaction":
      return <Smile className="size-4 text-rose-400" />
    case "topic_update":
      return <BellRing className="size-4 text-purple-400" />
    case "reply":
      return <MessageCircle className="size-4 text-blue-400" />
    default:
      return <Bell className="size-4 text-primary" />
  }
}

interface NotificationsListProps {
  initialNotifications: NotificationItem[]
  initialNextCursor: string | null
  initialHasMore: boolean
}

export function NotificationsList({
  initialNotifications,
  initialNextCursor,
  initialHasMore,
}: NotificationsListProps) {
  const [items, setItems] = useState<NotificationItem[]>(initialNotifications)
  const [cursor, setCursor] = useState<string | null>(initialNextCursor)
  const [hasMore, setHasMore] = useState<boolean>(initialHasMore)
  const [loading, setLoading] = useState(false)

  const loadMore = async () => {
    if (!cursor || loading || !hasMore) return
    setLoading(true)

    try {
      const res = await fetch(`/api/notifications?cursor=${encodeURIComponent(cursor)}&limit=20`)
      if (!res.ok) throw new Error("Bildirimler yüklenemedi")
      const data: {
        notifications: NotificationItem[]
        nextCursor: string | null
        hasMore: boolean
      } = await res.json()

      setItems((prev) => {
        const seen = new Set(prev.map((n) => n.id))
        const newOnes = data.notifications.filter((n) => !seen.has(n.id))
        return [...prev, ...newOnes]
      })
      setCursor(data.nextCursor)
      setHasMore(data.hasMore)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border p-12 text-center text-sm text-muted-foreground">
        Henüz bildiriminiz bulunmuyor.
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      {items.map((n) => {
        const inner = (
          <div
            className={`glass flex items-start gap-3 rounded-xl border p-3.5 transition-colors ${
              n.isRead ? "border-border" : "border-primary/40 bg-primary/5"
            }`}
          >
            <div className="mt-0.5 shrink-0 rounded-lg border border-border bg-card p-1.5">
              {getNotificationIcon(n.type)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-foreground leading-relaxed">{n.message}</p>
              <div className="mt-1 flex items-center gap-2 text-[10px] text-muted-foreground">
                <time dateTime={new Date(n.createdAt).toISOString()}>
                  {timeAgo(n.createdAt)}
                </time>
                {!n.isRead && (
                  <span className="inline-flex items-center gap-0.5 font-medium text-primary">
                    <span className="size-1.5 rounded-full bg-primary" />
                    Yeni
                  </span>
                )}
              </div>
            </div>
          </div>
        )

        return n.topicSlug ? (
          <Link key={n.id} href={`/konu/${n.topicSlug}`} className="block">
            {inner}
          </Link>
        ) : (
          <div key={n.id}>{inner}</div>
        )
      })}

      {hasMore && (
        <div className="pt-2 text-center">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={loadMore}
            disabled={loading}
            className="w-full text-xs gap-1.5 border-dashed"
          >
            {loading ? (
              <>
                <Loader2 className="size-3.5 animate-spin" />
                <span>Yükleniyor...</span>
              </>
            ) : (
              <>
                <ChevronDown className="size-3.5" />
                <span>Daha Fazla Bildirim Göster (Cursor Pagination)</span>
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  )
}

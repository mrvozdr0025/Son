"use client"

import Link from "next/link"
import useSWR from "swr"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { Mail } from "lucide-react"

const fetcher = (url: string) => fetch(url).then((r) => r.json())

export function NavMessagesButton({ initialUnread = 0 }: { initialUnread?: number }) {
  const { data } = useSWR<{ unread: number }>("/api/messages/unread", fetcher, {
    refreshInterval: 15000,
    fallbackData: { unread: initialUnread },
  })
  const unread = data?.unread ?? initialUnread

  return (
    <Link
      href="/mesajlar"
      aria-label="Özel Mesajlar"
      className={cn(
        buttonVariants({ variant: "ghost", size: "icon" }),
        "relative text-muted-foreground hover:text-foreground"
      )}
    >
      <Mail className="size-4" />
      {unread > 0 && (
        <span className="absolute -right-0.5 -top-0.5 flex size-4 items-center justify-center rounded-full bg-cyan-500 text-[10px] font-bold text-white shadow-xs">
          {unread > 9 ? "9+" : unread}
        </span>
      )}
    </Link>
  )
}

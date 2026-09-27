"use client"

import { usePathname } from "next/navigation"
import { useEffect, useRef } from "react"

// Fires a lightweight page-view beacon on every client-side navigation.
// Mounted once in the root layout.
export function ViewTracker() {
  const pathname = usePathname()
  const lastTracked = useRef<string | null>(null)

  useEffect(() => {
    if (!pathname || pathname === lastTracked.current) return
    lastTracked.current = pathname

    // Extract topic ID hint from /konu/[slug] URLs is done server-side by path;
    // just send the path itself.
    const body = JSON.stringify({ path: pathname })
    if (navigator.sendBeacon) {
      navigator.sendBeacon("/api/track", new Blob([body], { type: "application/json" }))
    } else {
      fetch("/api/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
        keepalive: true,
      }).catch(() => {})
    }
  }, [pathname])

  return null
}

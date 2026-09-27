"use client"

import { useEffect, useState } from "react"
import { WifiOff } from "lucide-react"

export function OfflineIndicator() {
  const [isOffline, setIsOffline] = useState(false)

  useEffect(() => {
    const handleOnline = () => setIsOffline(false)
    const handleOffline = () => setIsOffline(true)

    if (typeof window !== "undefined") {
      setIsOffline(!navigator.onLine)
      window.addEventListener("online", handleOnline)
      window.addEventListener("offline", handleOffline)
    }

    return () => {
      window.removeEventListener("online", handleOnline)
      window.removeEventListener("offline", handleOffline)
    }
  }, [])

  if (!isOffline) return null

  return (
    <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 z-50 flex items-center gap-2.5 rounded-xl bg-amber-500/90 text-black px-4 py-2.5 shadow-xl text-xs font-semibold backdrop-blur-md animate-in slide-in-from-bottom-2">
      <WifiOff className="size-4 shrink-0" />
      <span>Çevrimdışı moddasınız — Kayıtlı konular gösteriliyor</span>
    </div>
  )
}

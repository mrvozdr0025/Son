"use client"

import { Button } from "@/components/ui/button"
import { Bell, BellOff, Loader2 } from "lucide-react"
import { useEffect, useState } from "react"

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/")
  const rawData = atob(base64)
  const output = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; i++) output[i] = rawData.charCodeAt(i)
  return output
}

// Lets a signed-in user enable/disable push notifications on this device.
export function PushToggle() {
  const [supported, setSupported] = useState(false)
  const [subscribed, setSubscribed] = useState(false)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return
    setSupported(true)
    navigator.serviceWorker.ready
      .then((reg) => reg.pushManager.getSubscription())
      .then((sub) => setSubscribed(!!sub))
      .catch(() => {})
  }, [])

  async function toggle() {
    setBusy(true)
    try {
      const reg = await navigator.serviceWorker.ready
      const existing = await reg.pushManager.getSubscription()

      if (existing) {
        await fetch("/api/push/subscribe", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: existing.endpoint }),
        })
        await existing.unsubscribe()
        setSubscribed(false)
      } else {
        const permission = await Notification.requestPermission()
        if (permission !== "granted") return

        const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
        if (!publicKey) return

        const sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey),
        })
        const res = await fetch("/api/push/subscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(sub.toJSON()),
        })
        if (res.ok) setSubscribed(true)
        else await sub.unsubscribe()
      }
    } catch {
      // ignore push errors (unsupported browsers, blocked permission)
    } finally {
      setBusy(false)
    }
  }

  if (!supported) return null

  return (
    <Button type="button" variant="outline" size="sm" onClick={toggle} disabled={busy}>
      {busy ? (
        <Loader2 className="size-4 animate-spin" />
      ) : subscribed ? (
        <BellOff className="size-4" />
      ) : (
        <Bell className="size-4" />
      )}
      {subscribed ? "Push Bildirimleri Kapat" : "Push Bildirimleri Aç"}
    </Button>
  )
}

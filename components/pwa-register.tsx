"use client"

import { useEffect } from "react"

// Registers the service worker once on app load. Push subscription is done
// separately via the PushToggle component (requires user gesture).
export function PwaRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return
    navigator.serviceWorker.register("/sw.js").catch(() => {})
  }, [])

  return null
}

"use client"

import { useCallback, useEffect, useRef, useState } from "react"

const PREFIX = "nf-draft:"
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000 // drafts expire after 7 days

type StoredDraft = { value: string; savedAt: number }

function readDraft(key: string): string {
  try {
    const raw = localStorage.getItem(PREFIX + key)
    if (!raw) return ""
    const parsed: StoredDraft = JSON.parse(raw)
    if (Date.now() - parsed.savedAt > MAX_AGE_MS) {
      localStorage.removeItem(PREFIX + key)
      return ""
    }
    return parsed.value ?? ""
  } catch {
    return ""
  }
}

/**
 * Auto-saves a piece of form text to localStorage (debounced) and restores it
 * on mount. Drafts are device-local, ephemeral by design, and expire in 7 days.
 */
export function useDraft(key: string, initialValue = "") {
  const [value, setValue] = useState(initialValue)
  const [restored, setRestored] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Restore once on mount — an explicit initial value (e.g. quote prefill) wins.
  useEffect(() => {
    if (initialValue) return
    const draft = readDraft(key)
    if (draft) {
      setValue(draft)
      setRestored(true)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  // Debounced save on change.
  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      try {
        if (value.trim()) {
          const stored: StoredDraft = { value, savedAt: Date.now() }
          localStorage.setItem(PREFIX + key, JSON.stringify(stored))
        } else {
          localStorage.removeItem(PREFIX + key)
        }
      } catch {
        // storage full or unavailable — drafts are best-effort
      }
    }, 600)
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [key, value])

  const clearDraft = useCallback(() => {
    try {
      localStorage.removeItem(PREFIX + key)
    } catch {
      // ignore
    }
    setValue("")
    setRestored(false)
  }, [key])

  return { value, setValue, clearDraft, restored }
}

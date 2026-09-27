"use client"

import * as React from "react"
import { createContext, useContext, useEffect, useState, useTransition, useCallback } from "react"
import { setUserThemePreference, type ThemeMode } from "@/app/actions/theme-settings"

interface ThemeContextValue {
  themeMode: ThemeMode // "system" | "dark" | "light"
  resolvedTheme: "dark" | "light" // Actual active visual theme
  systemTheme: "dark" | "light" // OS reported theme
  setThemeMode: (mode: ThemeMode, persistToServer?: boolean) => Promise<void>
  toggleTheme: () => void
  isLoaded: boolean
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider")
  }
  return context
}

function getSystemPreference(): "dark" | "light" {
  if (typeof window === "undefined") return "dark"
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
}

export function ThemeProvider({
  children,
  defaultSiteTheme = "system",
  initialUserTheme,
}: {
  children: React.ReactNode
  defaultSiteTheme?: ThemeMode
  initialUserTheme?: ThemeMode | null
}) {
  const [themeMode, setThemeModeState] = useState<ThemeMode>(() => {
    if (initialUserTheme) return initialUserTheme
    return defaultSiteTheme
  })
  const [systemTheme, setSystemTheme] = useState<"dark" | "light">("dark")
  const [resolvedTheme, setResolvedTheme] = useState<"dark" | "light">("dark")
  const [isLoaded, setIsLoaded] = useState(false)
  const [, startTransition] = useTransition()

  // Apply smooth transition CSS flag and swap HTML classes
  const applyThemeToDOM = useCallback((resolved: "dark" | "light", withTransition = true) => {
    if (typeof document === "undefined") return

    const root = document.documentElement

    if (withTransition) {
      root.classList.add("theme-transitioning")
    }

    if (resolved === "dark") {
      root.classList.add("dark")
      root.classList.remove("light")
      root.style.colorScheme = "dark"
      root.setAttribute("data-theme", "dark")
    } else {
      root.classList.remove("dark")
      root.classList.add("light")
      root.style.colorScheme = "light"
      root.setAttribute("data-theme", "light")
    }

    if (withTransition) {
      window.setTimeout(() => {
        root.classList.remove("theme-transitioning")
      }, 350)
    }
  }, [])

  // Initialize on mount
  useEffect(() => {
    const sys = getSystemPreference()
    setSystemTheme(sys)

    // Check localStorage first
    let savedMode: ThemeMode | null = null
    try {
      const stored = localStorage.getItem("neon_theme_mode") as ThemeMode | null
      if (stored === "system" || stored === "dark" || stored === "light") {
        savedMode = stored
      }
    } catch {
      // localStorage may be disabled
    }

    const effectiveMode = savedMode || initialUserTheme || defaultSiteTheme || "system"
    setThemeModeState(effectiveMode)

    const effectiveResolved = effectiveMode === "system" ? sys : effectiveMode
    setResolvedTheme(effectiveResolved)
    applyThemeToDOM(effectiveResolved, false)
    setIsLoaded(true)

    // Listen to OS system color-scheme changes
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)")
    const handleSystemChange = (e: MediaQueryListEvent) => {
      const newSys = e.matches ? "dark" : "light"
      setSystemTheme(newSys)

      // If user selected system mode, immediately update theme with smooth transition
      const currentMode = (localStorage.getItem("neon_theme_mode") as ThemeMode) || effectiveMode
      if (currentMode === "system") {
        setResolvedTheme(newSys)
        applyThemeToDOM(newSys, true)
      }
    }

    mediaQuery.addEventListener("change", handleSystemChange)
    return () => mediaQuery.removeEventListener("change", handleSystemChange)
  }, [applyThemeToDOM, defaultSiteTheme, initialUserTheme])

  const setThemeMode = async (mode: ThemeMode, persistToServer = true) => {
    setThemeModeState(mode)

    try {
      localStorage.setItem("neon_theme_mode", mode)
    } catch {
      // ignore
    }

    const nextResolved = mode === "system" ? getSystemPreference() : mode
    setResolvedTheme(nextResolved)
    applyThemeToDOM(nextResolved, true)

    if (persistToServer) {
      startTransition(async () => {
        try {
          await setUserThemePreference(mode)
        } catch (err) {
          console.warn("[theme-provider] Failed to persist theme to server:", err)
        }
      })
    }
  }

  const toggleTheme = () => {
    // Quick toggle switches between light and dark
    const next: ThemeMode = resolvedTheme === "dark" ? "light" : "dark"
    setThemeMode(next, true)
  }

  return (
    <ThemeContext.Provider
      value={{
        themeMode,
        resolvedTheme,
        systemTheme,
        setThemeMode,
        toggleTheme,
        isLoaded,
      }}
    >
      {children}
    </ThemeContext.Provider>
  )
}

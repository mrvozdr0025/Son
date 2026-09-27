"use server"

import { db } from "@/lib/db"
import { siteSettings, profiles } from "@/lib/db/schema"
import { getCurrentProfile, requireAdmin } from "@/lib/session"
import { eq } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { cookies } from "next/headers"

export type ThemeMode = "system" | "dark" | "light"

export async function getSiteThemeSettings(): Promise<{ defaultTheme: ThemeMode }> {
  try {
    const [row] = await db
      .select({ defaultTheme: siteSettings.defaultTheme })
      .from(siteSettings)
      .where(eq(siteSettings.id, "site_config"))
      .limit(1)

    if (row && (row.defaultTheme === "dark" || row.defaultTheme === "light" || row.defaultTheme === "system")) {
      return { defaultTheme: row.defaultTheme as ThemeMode }
    }
  } catch (err) {
    // If table doesn't exist yet or query fails, fallback gracefully
    console.warn("[theme-settings] getSiteThemeSettings fallback to system:", err)
  }

  return { defaultTheme: "system" }
}

export async function updateSiteDefaultTheme(theme: ThemeMode): Promise<{ success: boolean; error?: string }> {
  try {
    await requireAdmin()

    if (theme !== "system" && theme !== "dark" && theme !== "light") {
      return { success: false, error: "Geçersiz tema seçimi" }
    }

    try {
      const [existing] = await db
        .select({ id: siteSettings.id })
        .from(siteSettings)
        .where(eq(siteSettings.id, "site_config"))
        .limit(1)

      if (existing) {
        await db
          .update(siteSettings)
          .set({ defaultTheme: theme, updatedAt: new Date() })
          .where(eq(siteSettings.id, "site_config"))
      } else {
        await db.insert(siteSettings).values({
          id: "site_config",
          defaultTheme: theme,
        })
      }
    } catch {
      // If table needs creation or error, attempt direct fallback
      await db.insert(siteSettings).values({
        id: "site_config",
        defaultTheme: theme,
      }).onConflictDoUpdate?.({
        target: siteSettings.id,
        set: { defaultTheme: theme, updatedAt: new Date() },
      })
    }

    revalidatePath("/", "layout")
    return { success: true }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Varsayılan tema güncellenemedi"
    return { success: false, error: message }
  }
}

export async function getUserThemePreference(): Promise<{ theme: ThemeMode; isSavedInProfile: boolean }> {
  try {
    const profile = await getCurrentProfile()
    if (profile && profile.themePreference) {
      const pref = profile.themePreference as ThemeMode
      if (pref === "dark" || pref === "light" || pref === "system") {
        return { theme: pref, isSavedInProfile: true }
      }
    }

    // Check cookie fallback
    const cookieStore = await cookies()
    const cookieVal = cookieStore.get("neon_theme_pref")?.value as ThemeMode
    if (cookieVal === "dark" || cookieVal === "light" || cookieVal === "system") {
      return { theme: cookieVal, isSavedInProfile: false }
    }
  } catch (err) {
    console.warn("[theme-settings] getUserThemePreference fallback:", err)
  }

  const { defaultTheme } = await getSiteThemeSettings()
  return { theme: defaultTheme, isSavedInProfile: false }
}

export async function setUserThemePreference(theme: ThemeMode): Promise<{ success: boolean; theme: ThemeMode; error?: string }> {
  try {
    if (theme !== "system" && theme !== "dark" && theme !== "light") {
      return { success: false, theme: "system", error: "Geçersiz tema seçeneği" }
    }

    const cookieStore = await cookies()
    cookieStore.set("neon_theme_pref", theme, {
      path: "/",
      maxAge: 365 * 24 * 60 * 60,
      sameSite: "lax",
    })

    const profile = await getCurrentProfile()
    if (profile) {
      await db
        .update(profiles)
        .set({ themePreference: theme })
        .where(eq(profiles.id, profile.id))
    }

    revalidatePath("/ayarlar")
    revalidatePath("/ayarlar/tema")
    return { success: true, theme }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Tema tercihi kaydedilemedi"
    return { success: false, theme, error: message }
  }
}

"use server"

import { db } from "@/lib/db"
import { siteSettings } from "@/lib/db/schema"
import { requireAdmin } from "@/lib/session"
import { eq } from "drizzle-orm"
import { revalidatePath } from "next/cache"

export interface SiteSettingsData {
  defaultTheme: "system" | "dark" | "light"
  googleAnalyticsId: string | null
  googleSearchConsoleCode: string | null
  googleAdsenseId: string | null
  googleTagManagerId: string | null
  customHeadCode: string | null
  customBodyCode: string | null
  siteTitle: string | null
  siteDescription: string | null
  robotsTxt: string | null
  updatedAt?: Date
}

export async function getSiteSettings(): Promise<SiteSettingsData> {
  try {
    const [row] = await db
      .select()
      .from(siteSettings)
      .where(eq(siteSettings.id, "site_config"))
      .limit(1)

    if (row) {
      return {
        defaultTheme: (row.defaultTheme as "system" | "dark" | "light") || "system",
        googleAnalyticsId: row.googleAnalyticsId || null,
        googleSearchConsoleCode: row.googleSearchConsoleCode || null,
        googleAdsenseId: row.googleAdsenseId || null,
        googleTagManagerId: row.googleTagManagerId || null,
        customHeadCode: row.customHeadCode || null,
        customBodyCode: row.customBodyCode || null,
        siteTitle: row.siteTitle || null,
        siteDescription: row.siteDescription || null,
        robotsTxt: row.robotsTxt || null,
        updatedAt: row.updatedAt,
      }
    }
  } catch (err) {
    console.warn("[site-settings] Failed to fetch settings:", err)
  }

  return {
    defaultTheme: "system",
    googleAnalyticsId: null,
    googleSearchConsoleCode: null,
    googleAdsenseId: null,
    googleTagManagerId: null,
    customHeadCode: null,
    customBodyCode: null,
    siteTitle: null,
    siteDescription: null,
    robotsTxt: null,
  }
}

export async function updateSiteSettings(
  formData: FormData
): Promise<{ success: boolean; error?: string }> {
  try {
    await requireAdmin()

    const rawGtag = String(formData.get("googleAnalyticsId") ?? "").trim()
    const rawGsc = String(formData.get("googleSearchConsoleCode") ?? "").trim()
    const rawAdsense = String(formData.get("googleAdsenseId") ?? "").trim()
    const rawGtm = String(formData.get("googleTagManagerId") ?? "").trim()
    const rawCustomHead = String(formData.get("customHeadCode") ?? "").trim()
    const rawCustomBody = String(formData.get("customBodyCode") ?? "").trim()
    const rawSiteTitle = String(formData.get("siteTitle") ?? "").trim()
    const rawSiteDescription = String(formData.get("siteDescription") ?? "").trim()
    const rawDefaultTheme = String(formData.get("defaultTheme") ?? "system").trim()

    // Clean Google Search Console input: If user pastes `<meta name="google-site-verification" content="XYZ" />`, extract the token
    let cleanGsc = rawGsc
    const metaMatch = rawGsc.match(/content=["']([^"']+)["']/i)
    if (metaMatch && metaMatch[1]) {
      cleanGsc = metaMatch[1].trim()
    }

    // Clean AdSense ID: Ensure format ca-pub-XXXXX if pasted as pub-XXXXX
    let cleanAdsense = rawAdsense
    if (cleanAdsense && !cleanAdsense.startsWith("ca-pub-") && cleanAdsense.startsWith("pub-")) {
      cleanAdsense = `ca-${cleanAdsense}`
    }

    const payload = {
      defaultTheme: (rawDefaultTheme === "dark" || rawDefaultTheme === "light" ? rawDefaultTheme : "system") as "system" | "dark" | "light",
      googleAnalyticsId: rawGtag || null,
      googleSearchConsoleCode: cleanGsc || null,
      googleAdsenseId: cleanAdsense || null,
      googleTagManagerId: rawGtm || null,
      customHeadCode: rawCustomHead || null,
      customBodyCode: rawCustomBody || null,
      siteTitle: rawSiteTitle || null,
      siteDescription: rawSiteDescription || null,
      updatedAt: new Date(),
    }

    const [existing] = await db
      .select({ id: siteSettings.id })
      .from(siteSettings)
      .where(eq(siteSettings.id, "site_config"))
      .limit(1)

    if (existing) {
      await db
        .update(siteSettings)
        .set(payload)
        .where(eq(siteSettings.id, "site_config"))
    } else {
      await db.insert(siteSettings).values({
        id: "site_config",
        ...payload,
      })
    }

    revalidatePath("/", "layout")
    revalidatePath("/admin/ayarlar")
    return { success: true }
  } catch (err) {
    console.error("[site-settings] Update error:", err)
    return {
      success: false,
      error: err instanceof Error ? err.message : "Ayarlar kaydedilirken hata oluştu",
    }
  }
}

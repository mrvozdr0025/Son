"use server"

import { revalidatePath } from "next/cache"
import { db } from "@/lib/db"
import {
  profiles,
  type NotificationPreferences,
  defaultNotificationPreferences,
} from "@/lib/db/schema"
import { getCurrentProfile } from "@/lib/session"
import { eq } from "drizzle-orm"

export async function getNotificationPreferences(): Promise<NotificationPreferences> {
  const current = await getCurrentProfile()
  if (!current) return defaultNotificationPreferences

  const [row] = await db
    .select({
      notificationSettings: profiles.notificationSettings,
    })
    .from(profiles)
    .where(eq(profiles.id, current.id))
    .limit(1)

  return (
    (row?.notificationSettings as NotificationPreferences) ||
    defaultNotificationPreferences
  )
}

export async function updateNotificationPreferences(
  preferences: NotificationPreferences
): Promise<{ success: boolean; error?: string }> {
  try {
    const current = await getCurrentProfile()
    if (!current) {
      return { success: false, error: "Giriş yapmanız gerekiyor." }
    }

    await db
      .update(profiles)
      .set({
        notificationSettings: preferences,
      })
      .where(eq(profiles.id, current.id))

    revalidatePath("/ayarlar/bildirimler")
    revalidatePath("/bildirimler")
    return { success: true }
  } catch (err: any) {
    console.error("[notification-settings] error:", err)
    return { success: false, error: err?.message || "Ayarlar kaydedilemedi." }
  }
}

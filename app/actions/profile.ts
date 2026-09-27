"use server"

import { revalidatePath } from "next/cache"
import { db } from "@/lib/db"
import { profiles } from "@/lib/db/schema"
import { getCurrentProfile } from "@/lib/session"
import { eq } from "drizzle-orm"

export interface UpdateProfileInput {
  displayName: string
  bio?: string
  avatarUrl?: string
  coverUrl?: string
}

export async function updateProfile(input: UpdateProfileInput): Promise<{
  success: boolean
  error?: string
  username?: string
}> {
  try {
    const current = await getCurrentProfile()
    if (!current) {
      return { success: false, error: "Giriş yapmanız gerekiyor." }
    }

    const displayName = input.displayName.trim()
    if (displayName.length < 2 || displayName.length > 40) {
      return { success: false, error: "Görünen isim 2 ile 40 karakter arasında olmalıdır." }
    }

    const bio = input.bio ? input.bio.trim().slice(0, 500) : null
    const avatarUrl = input.avatarUrl ? input.avatarUrl.trim().slice(0, 500) : null
    const coverUrl = input.coverUrl ? input.coverUrl.trim().slice(0, 500) : null

    await db
      .update(profiles)
      .set({
        displayName,
        bio,
        avatarUrl,
        coverUrl,
      })
      .where(eq(profiles.id, current.id))

    revalidatePath(`/profil/${current.username}`)
    revalidatePath("/ayarlar")
    revalidatePath("/")

    return { success: true, username: current.username }
  } catch (err: any) {
    console.error("[profile] Update profile error:", err)
    return { success: false, error: err?.message || "Profil güncellenirken bir hata oluştu." }
  }
}

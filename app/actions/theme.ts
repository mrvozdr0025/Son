"use server"

import { db } from "@/lib/db"
import { profiles } from "@/lib/db/schema"
import { getTheme, PROFILE_THEMES } from "@/lib/gamification"
import { requireProfile } from "@/lib/session"
import { eq } from "drizzle-orm"
import { revalidatePath } from "next/cache"

export async function setProfileTheme(themeId: string) {
  const profile = await requireProfile()
  const theme = PROFILE_THEMES.find((t) => t.id === themeId)
  if (!theme) throw new Error("Geçersiz tema")
  if (profile.karma < theme.minKarma) {
    throw new Error(`Bu tema için en az ${theme.minKarma} karma gerekli`)
  }
  await db.update(profiles).set({ profileTheme: theme.id }).where(eq(profiles.id, profile.id))
  revalidatePath(`/profil/${profile.username}`)
  return getTheme(theme.id)
}

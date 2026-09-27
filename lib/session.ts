import "server-only"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { profiles } from "@/lib/db/schema"
import { eq, sql } from "drizzle-orm"
import { headers } from "next/headers"

export type Profile = typeof profiles.$inferSelect

// Returns the current session user's forum profile (creating one on first
// visit after sign-up), or null when signed out.
export async function getCurrentProfile(): Promise<Profile | null> {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) return null

  const existing = await db
    .select()
    .from(profiles)
    .where(eq(profiles.userId, session.user.id))
    .limit(1)
  if (existing[0]) return existing[0]

  // First login: create a profile from the auth user.
  // The very first real (non-AI) member becomes the site admin.
  const [{ humanCount }] = await db
    .select({ humanCount: sql<number>`count(*)::int` })
    .from(profiles)
    .where(eq(profiles.isAI, false))

  const base = (session.user.name || session.user.email.split("@")[0])
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .slice(0, 20) || "uye"
  let username = base
  for (let i = 0; i < 5; i++) {
    try {
      const inserted = await db
        .insert(profiles)
        .values({
          userId: session.user.id,
          username,
          displayName: session.user.name || username,
          isAdmin: humanCount === 0,
        })
        .returning()
      return inserted[0]
    } catch {
      username = `${base}${Math.floor(Math.random() * 9999)}`
    }
  }
  return null
}

export async function requireProfile(): Promise<Profile> {
  const profile = await getCurrentProfile()
  if (!profile) throw new Error("Giriş yapmalısınız")

  // Check if temporary ban has expired
  if (profile.isBanned) {
    if (profile.bannedUntil && new Date(profile.bannedUntil) < new Date()) {
      await db.update(profiles).set({ isBanned: false, bannedUntil: null }).where(eq(profiles.id, profile.id))
      profile.isBanned = false
      profile.bannedUntil = null
    } else {
      throw new Error("Hesabınız askıya alınmış")
    }
  }

  // Check if temporary mute has expired
  if (profile.isMuted && profile.mutedUntil && new Date(profile.mutedUntil) < new Date()) {
    await db.update(profiles).set({ isMuted: false, mutedUntil: null }).where(eq(profiles.id, profile.id))
    profile.isMuted = false
    profile.mutedUntil = null
  }

  return profile
}

export async function requireAdmin(): Promise<Profile> {
  const profile = await requireProfile()
  if (!profile.isAdmin && profile.role !== "superadmin" && profile.role !== "admin") {
    throw new Error("Yetkiniz yok")
  }
  return profile
}

export async function requirePermission(permission: import("@/lib/rbac").PermissionKey): Promise<Profile> {
  const { hasPermission } = await import("@/lib/rbac")
  const profile = await requireProfile()
  if (!hasPermission(profile, permission)) {
    throw new Error("Bu işlem için yetkiniz bulunmuyor.")
  }
  return profile
}


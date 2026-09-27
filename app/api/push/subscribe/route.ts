import { db } from "@/lib/db"
import { pushSubscriptions } from "@/lib/db/schema"
import { getCurrentProfile } from "@/lib/session"
import { eq } from "drizzle-orm"
import { type NextRequest, NextResponse } from "next/server"

// Register (or refresh) a browser push subscription for the signed-in user.
export async function POST(request: NextRequest) {
  const profile = await getCurrentProfile()
  if (!profile) return NextResponse.json({ error: "unauthorized" }, { status: 401 })

  try {
    const sub = (await request.json()) as {
      endpoint?: string
      keys?: { p256dh?: string; auth?: string }
    }
    if (!sub.endpoint || !sub.keys?.p256dh || !sub.keys?.auth) {
      return NextResponse.json({ error: "invalid subscription" }, { status: 400 })
    }

    await db
      .insert(pushSubscriptions)
      .values({
        profileId: profile.id,
        endpoint: sub.endpoint,
        p256dh: sub.keys.p256dh,
        auth: sub.keys.auth,
      })
      .onConflictDoUpdate({
        target: pushSubscriptions.endpoint,
        set: { profileId: profile.id, p256dh: sub.keys.p256dh, auth: sub.keys.auth },
      })

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: "failed" }, { status: 500 })
  }
}

// Remove a subscription (user turned notifications off)
export async function DELETE(request: NextRequest) {
  const profile = await getCurrentProfile()
  if (!profile) return NextResponse.json({ error: "unauthorized" }, { status: 401 })

  try {
    const { endpoint } = (await request.json()) as { endpoint?: string }
    if (!endpoint) return NextResponse.json({ error: "missing endpoint" }, { status: 400 })
    await db.delete(pushSubscriptions).where(eq(pushSubscriptions.endpoint, endpoint))
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: "failed" }, { status: 500 })
  }
}

import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { newsletterSubscribers } from "@/lib/db/schema"
import { getCurrentProfile } from "@/lib/session"
import { eq } from "drizzle-orm"

export async function POST(req: NextRequest) {
  try {
    let email = ""
    const contentType = req.headers.get("content-type") || ""

    if (contentType.includes("application/json")) {
      const body = await req.json()
      email = String(body.email ?? "").trim()
    } else {
      const formData = await req.formData()
      email = String(formData.get("email") ?? "").trim()
    }

    if (!email || !email.includes("@")) {
      return NextResponse.json({ error: "Geçerli bir e-posta adresi girin" }, { status: 400 })
    }

    const profile = await getCurrentProfile().catch(() => null)

    await db
      .insert(newsletterSubscribers)
      .values({
        email: email.toLowerCase(),
        profileId: profile?.id || null,
        isActive: true,
      })
      .onConflictDoUpdate({
        target: newsletterSubscribers.email,
        set: { isActive: true },
      })

    if (contentType.includes("application/json")) {
      return NextResponse.json({ success: true, message: "Abonelik başarıyla tamamlandı!" })
    }

    // Form post redirect back to /bulten with success
    return NextResponse.redirect(new URL("/bulten?subscribed=1", req.url), 303)
  } catch (err: any) {
    console.error("[newsletter-subscribe] error:", err)
    return NextResponse.json({ error: "Bir hata oluştu" }, { status: 500 })
  }
}

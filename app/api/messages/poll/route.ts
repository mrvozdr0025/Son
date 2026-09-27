import { NextRequest, NextResponse } from "next/server"
import { getCurrentProfile } from "@/lib/session"
import { getConversationMessages } from "@/app/actions/messages"

export async function GET(req: NextRequest) {
  const profile = await getCurrentProfile()
  if (!profile) {
    return NextResponse.json({ error: "Giriş yapmalısınız" }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const convIdStr = searchParams.get("conv")
  if (!convIdStr) {
    return NextResponse.json({ error: "conv parametresi gerekli" }, { status: 400 })
  }

  const convId = parseInt(convIdStr, 10)
  if (isNaN(convId)) {
    return NextResponse.json({ error: "Geçersiz conv id" }, { status: 400 })
  }

  try {
    const messages = await getConversationMessages(convId)
    return NextResponse.json({ messages })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? "Hata" }, { status: 500 })
  }
}

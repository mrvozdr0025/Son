import { Metadata } from "next"
import { redirect } from "next/navigation"
import { Navbar } from "@/components/navbar"
import { Breadcrumb } from "@/components/breadcrumb"
import { DmChat } from "@/components/dm-chat"
import { getCurrentProfile } from "@/lib/session"
import {
  getUserConversations,
  getConversationMessages,
  startConversationByUsername,
} from "@/app/actions/messages"

export const metadata: Metadata = {
  title: "Özel Mesajlar | neonsform",
  description: "Diğer kullanıcılar ve AI asistanlarıyla birebir özel mesajlaşma.",
}

export default async function MessagesPage({
  searchParams,
}: {
  searchParams: Promise<{ conv?: string; user?: string }>
}) {
  const profile = await getCurrentProfile()
  if (!profile) {
    redirect("/giris")
  }

  const { conv: convParam, user: userParam } = await searchParams

  // If user parameter is provided, start/get conversation with that user
  if (userParam && userParam !== profile.username) {
    try {
      const convId = await startConversationByUsername(userParam)
      redirect(`/mesajlar?conv=${convId}`)
    } catch (err) {
      console.error("Kullanıcıyla sohbet başlatılamadı:", err)
    }
  }

  const conversations = await getUserConversations()

  let activeConvId = convParam ? parseInt(convParam, 10) : undefined
  if (isNaN(activeConvId as number)) {
    activeConvId = undefined
  }

  // If no conversation is selected in URL but conversations exist, pick the first one on desktop
  if (!activeConvId && conversations.length > 0) {
    activeConvId = conversations[0].id
  }

  const activeConv = conversations.find((c) => c.id === activeConvId) ?? null

  const messages = activeConvId ? await getConversationMessages(activeConvId) : []

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Navbar />
      <div className="mx-auto w-full max-w-6xl px-4 pt-4">
        <Breadcrumb items={[{ label: "Özel Mesajlar" }]} />
      </div>
      <main className="flex-1">
        <DmChat
          currentProfileId={profile.id}
          initialConversations={conversations}
          activeConversationId={activeConvId}
          activeConversation={activeConv}
          initialMessages={messages}
        />
      </main>
    </div>
  )
}

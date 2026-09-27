import type { Metadata } from "next"
import { Navbar } from "@/components/navbar"
import { Breadcrumb } from "@/components/breadcrumb"
import { ChatClient } from "@/components/chat-client"
import { listChatPersonas } from "@/app/actions/viral"

export const metadata: Metadata = {
  title: "AI ile Sohbet",
  description:
    "Forumun AI kullanıcılarıyla birebir sohbet et. Cesaretin varsa roast modunu aç, seninle atışsınlar.",
}

export default async function ChatPage() {
  const personas = await listChatPersonas()

  return (
    <>
      <Navbar />
      <main className="mx-auto w-full max-w-3xl px-4 py-8">
        <Breadcrumb items={[{ label: "AI ile Sohbet" }]} />
        <ChatClient personas={personas} />
      </main>
    </>
  )
}

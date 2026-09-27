import type { Metadata } from "next"
import { Navbar } from "@/components/navbar"
import { Breadcrumb } from "@/components/breadcrumb"
import { ArenaClient } from "@/components/arena-client"

export const metadata: Metadata = {
  title: "AI Arenası",
  description:
    "İki yapay zeka kullanıcısını istediğin konuda kapıştır. Soruyu sor, atışmayı izle.",
}

export default function ArenaPage() {
  return (
    <>
      <Navbar />
      <main className="mx-auto w-full max-w-3xl px-4 py-8">
        <Breadcrumb items={[{ label: "AI Arenası" }]} />
        <ArenaClient />
      </main>
    </>
  )
}

import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { Navbar } from "@/components/navbar"
import { Breadcrumb } from "@/components/breadcrumb"
import { NewTopicForm } from "@/components/new-topic-form"
import { getCategories } from "@/lib/queries"
import { getCurrentProfile } from "@/lib/session"

export const metadata: Metadata = { title: "Yeni Konu" }

export default async function NewTopicPage() {
  const profile = await getCurrentProfile()
  if (!profile) redirect("/giris?next=/yeni-konu")

  const categories = await getCategories()

  return (
    <>
      <Navbar />
      <main className="mx-auto w-full max-w-2xl px-4 py-6">
        <Breadcrumb items={[{ label: "Yeni Konu Aç" }]} />
        <h1 className="mb-4 text-xl font-bold text-foreground">Yeni Konu Aç</h1>
        <NewTopicForm categories={categories.map((c) => ({ id: c.id, name: c.name }))} />
      </main>
    </>
  )
}

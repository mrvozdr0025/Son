import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { getCurrentProfile } from "@/lib/session"
import { Navbar } from "@/components/navbar"
import { AdminNav } from "@/components/admin/admin-nav"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "Admin Paneli",
  robots: { index: false, follow: false },
}

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const profile = await getCurrentProfile()
  if (!profile?.isAdmin) redirect("/")

  return (
    <>
      <Navbar />
      <main className="mx-auto w-full max-w-6xl px-4 py-6">
        <h1 className="mb-4 text-xl font-bold">Admin Paneli</h1>
        <AdminNav />
        <div className="mt-6">{children}</div>
      </main>
    </>
  )
}

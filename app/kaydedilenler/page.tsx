import { Metadata } from "next"
import Link from "next/link"
import { redirect } from "next/navigation"
import { Navbar } from "@/components/navbar"
import { Breadcrumb } from "@/components/breadcrumb"
import { TopicCard } from "@/components/topic-card"
import { Button } from "@/components/ui/button"
import { getUserBookmarks } from "@/app/actions/bookmarks"
import { getCurrentProfile } from "@/lib/session"
import { Bookmark, Compass } from "lucide-react"

export const metadata: Metadata = {
  title: "Kaydedilenler | neonsform",
  description: "Daha sonra okumak için kaydettiğiniz konular.",
}

export default async function BookmarksPage() {
  const profile = await getCurrentProfile()
  if (!profile) {
    redirect("/giris?next=/kaydedilenler")
  }

  const bookmarkedTopics = await getUserBookmarks()

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="mx-auto w-full max-w-4xl px-4 py-6 sm:py-8">
        <Breadcrumb items={[{ label: "Kaydedilenler" }]} />
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-border/80 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 border border-primary/20 text-primary">
              <Bookmark className="size-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-foreground">
                Kaydedilen Konular
              </h1>
              <p className="text-xs text-muted-foreground">
                Daha sonra okumak veya tekrar göz atmak için sakladığınız konular
              </p>
            </div>
          </div>
          <span className="rounded-full bg-secondary px-3 py-1 font-mono text-xs font-semibold text-secondary-foreground">
            {bookmarkedTopics.length} Konu
          </span>
        </div>

        {bookmarkedTopics.length > 0 ? (
          <div className="flex flex-col gap-3">
            {bookmarkedTopics.map((topic) => (
              <TopicCard key={topic.id} topic={topic} />
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-border/80 p-12 text-center">
            <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-muted/60 text-muted-foreground mb-4">
              <Bookmark className="size-7" />
            </div>
            <h2 className="text-base font-bold text-foreground">Henüz kaydedilen konu yok</h2>
            <p className="mx-auto mt-1.5 max-w-md text-xs text-muted-foreground leading-relaxed">
              Konu sayfalarında veya kartlar üzerindeki &quot;Kaydet&quot; butonunu kullanarak
              ilginizi çeken içerikleri daha sonra incelemek üzere buraya ekleyebilirsiniz.
            </p>
            <div className="mt-5">
              <Link href="/">
                <Button size="sm" className="gap-2">
                  <Compass className="size-4" />
                  Konuları Keşfet
                </Button>
              </Link>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

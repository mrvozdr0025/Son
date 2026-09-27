import { Suspense } from "react"
import { Navbar } from "@/components/navbar"
import { Sidebar } from "@/components/sidebar"
import { TopicFeed } from "@/components/topic-feed"
import { HomeCategoriesSection } from "@/components/home-categories-section"
import { Skeleton } from "@/components/ui/skeleton"
import { getCurrentProfile } from "@/lib/session"
import { getCategories, type FeedSort } from "@/lib/queries"

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ sirala?: string; sayfa?: string }>
}) {
  const params = await searchParams
  const sort = (["yeni", "populer", "aktif", "takip"].includes(params.sirala ?? "")
    ? params.sirala
    : "aktif") as FeedSort
  const page = Math.max(0, Number(params.sayfa ?? 0) || 0)
  const [profile, allCategories] = await Promise.all([
    getCurrentProfile(),
    getCategories(),
  ])

  return (
    <>
      <Navbar />
      <main className="mx-auto grid max-w-6xl grid-cols-1 gap-6 px-4 py-6 lg:grid-cols-[1fr_300px]">
        <div>
          <h1 className="sr-only">neonsform ana sayfa</h1>
          <HomeCategoriesSection categories={allCategories} />
          <Suspense fallback={<FeedSkeleton />}>
            <TopicFeed
              sort={sort}
              page={page}
              basePath="/"
              isAuthed={!!profile}
              viewerProfileId={profile?.id}
              showFollowTab
            />
          </Suspense>
        </div>
        <aside className="hidden lg:block" aria-label="Kenar çubuğu">
          <Suspense fallback={<Skeleton className="h-96 rounded-xl" />}>
            <Sidebar />
          </Suspense>
        </aside>
      </main>
    </>
  )
}

function FeedSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <Skeleton key={i} className="h-32 rounded-xl" />
      ))}
    </div>
  )
}

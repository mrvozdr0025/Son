import { Suspense } from "react"
import { notFound } from "next/navigation"
import type { Metadata } from "next"
import { Navbar } from "@/components/navbar"
import { Sidebar } from "@/components/sidebar"
import { TopicFeed } from "@/components/topic-feed"
import { CategoryIcon } from "@/components/category-icon"
import { FollowButton } from "@/components/follow-button"
import { Breadcrumb } from "@/components/breadcrumb"
import { Rss } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { isFollowing } from "@/app/actions/follow"
import { getCategoryBySlug } from "@/lib/queries"
import { getCurrentProfile } from "@/lib/session"
import type { FeedSort } from "@/lib/queries"

import {
  generateBreadcrumbJsonLd,
  generateCollectionPageJsonLd,
  getBaseUrl,
} from "@/lib/seo"

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const category = await getCategoryBySlug(slug)
  if (!category) return { title: "Kategori bulunamadı" }

  const base = getBaseUrl()
  const canonicalUrl = `${base}/kategori/${category.slug}`
  const description =
    category.description ||
    `${category.name} kategorisindeki en yeni konular, rehberler, görüşler ve topluluk tartışmaları.`

  return {
    title: `${category.name} Tartışmaları ve Konuları — neonsform`,
    description,
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title: `${category.name} Tartışmaları — neonsform`,
      description,
      type: "website",
      url: canonicalUrl,
      siteName: "neonsform",
    },
    twitter: {
      card: "summary_large_image",
      title: `${category.name} Tartışmaları — neonsform`,
      description,
    },
  }
}

export default async function CategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ sirala?: string; sayfa?: string }>
}) {
  const [{ slug }, sp] = await Promise.all([params, searchParams])
  const category = await getCategoryBySlug(slug)
  if (!category) notFound()

  const sort = (["yeni", "populer", "aktif"].includes(sp.sirala ?? "") ? sp.sirala : "aktif") as FeedSort
  const page = Math.max(0, Number(sp.sayfa ?? 0) || 0)
  const profile = await getCurrentProfile()
  const following = profile ? await isFollowing("category", category.id) : false

  const collectionJsonLd = generateCollectionPageJsonLd({
    name: category.name,
    description: category.description,
    slug: category.slug,
  })

  const breadcrumbJsonLd = generateBreadcrumbJsonLd([
    { name: "Ana Sayfa", url: "/" },
    { name: category.name, url: `/kategori/${category.slug}` },
  ])

  return (
    <>
      <Navbar />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <main className="mx-auto grid max-w-6xl grid-cols-1 gap-6 px-4 py-6 lg:grid-cols-[1fr_300px]">
        <div>
          <Breadcrumb items={[{ label: category.name }]} />
          <header className="mb-4 flex flex-wrap items-center gap-3 rounded-xl border border-border/60 bg-card/60 p-4 backdrop-blur-sm">
            <span
              className="flex size-11 items-center justify-center rounded-xl"
              style={{ color: category.color, backgroundColor: `${category.color}1a` }}
            >
              <CategoryIcon icon={category.icon} className="size-5" />
            </span>
            <div className="min-w-0 flex-1">
              <h1 className="text-lg font-bold text-foreground">{category.name}</h1>
              <p className="text-sm text-muted-foreground">{category.description}</p>
            </div>
            <div className="flex items-center gap-2">
              <FollowButton
                targetType="category"
                targetId={category.id}
                initialFollowing={following}
                isAuthed={!!profile}
                label="Takip Et"
                unfollowLabel="Takiptesin"
              />
              <a
                href={`/kategori/${category.slug}/rss`}
                className="flex size-8 items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors hover:text-foreground"
                aria-label={`${category.name} RSS beslemesi`}
                title="RSS beslemesi"
              >
                <Rss className="size-4" />
              </a>
            </div>
          </header>
          <Suspense fallback={<Skeleton className="h-96 rounded-xl" />}>
            <TopicFeed
              sort={sort}
              page={page}
              categoryId={category.id}
              basePath={`/kategori/${category.slug}`}
              isAuthed={!!profile}
              viewerProfileId={profile?.id}
            />
          </Suspense>
        </div>
        <aside className="hidden lg:block" aria-label="Kenar çubuğu">
          <Suspense fallback={<Skeleton className="h-96 rounded-xl" />}>
            <Sidebar activeCategorySlug={category.slug} />
          </Suspense>
        </aside>
      </main>
    </>
  )
}

import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { Navbar } from "@/components/navbar"
import { Breadcrumb } from "@/components/breadcrumb"
import { TopicCard } from "@/components/topic-card"
import { getPopularTags, getTagBySlug, getTopicsByTag } from "@/lib/queries"
import { getCurrentProfile } from "@/lib/session"
import { Tag } from "lucide-react"

import { generateBreadcrumbJsonLd, getBaseUrl } from "@/lib/seo"

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const tag = await getTagBySlug(slug)
  if (!tag) return { title: "Etiket bulunamadı" }

  const base = getBaseUrl()
  const canonicalUrl = `${base}/etiket/${tag.slug}`
  const description = `#${tag.name} etiketiyle paylaşılan en güncel forum tartışmaları, rehberler ve topluluk içerikleri.`

  return {
    title: `#${tag.name} Konuları ve Tartışmaları — neonsform`,
    description,
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title: `#${tag.name} Konuları — neonsform`,
      description,
      type: "website",
      url: canonicalUrl,
    },
    twitter: {
      card: "summary",
      title: `#${tag.name} Konuları — neonsform`,
      description,
    },
  }
}

export default async function TagPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const tag = await getTagBySlug(slug)
  if (!tag) notFound()

  const [topicList, popularTags, profile] = await Promise.all([
    getTopicsByTag(tag.id),
    getPopularTags(15),
    getCurrentProfile(),
  ])

  const breadcrumbJsonLd = generateBreadcrumbJsonLd([
    { name: "Ana Sayfa", url: "/" },
    { name: `#${tag.name}`, url: `/etiket/${tag.slug}` },
  ])

  return (
    <>
      <Navbar />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <main className="mx-auto w-full max-w-3xl px-4 py-6">
        <Breadcrumb items={[{ label: `#${tag.name}` }]} />
        <header className="glass mb-5 rounded-xl border border-border p-5">
          <div className="flex items-center gap-2">
            <Tag className="size-5 text-primary" />
            <h1 className="text-xl font-bold text-foreground">#{tag.name}</h1>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {topicList.length} konu bu etiketi kullanıyor
          </p>
        </header>

        {popularTags.length > 1 && (
          <nav aria-label="Popüler etiketler" className="mb-5 flex flex-wrap gap-1.5">
            {popularTags
              .filter((t) => t.id !== tag.id)
              .map((t) => (
                <Link
                  key={t.id}
                  href={`/etiket/${t.slug}`}
                  className="rounded-full border border-border bg-secondary/50 px-2 py-0.5 text-xs text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground"
                >
                  #{t.name} <span className="font-mono">({t.topicCount})</span>
                </Link>
              ))}
          </nav>
        )}

        <div className="flex flex-col gap-3">
          {topicList.map((topic) => (
            <TopicCard key={topic.id} topic={topic} isAuthed={Boolean(profile)} />
          ))}
          {topicList.length === 0 && (
            <p className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
              Bu etikette henüz konu yok.
            </p>
          )}
        </div>
      </main>
    </>
  )
}

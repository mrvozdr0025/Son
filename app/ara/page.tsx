import type { Metadata } from "next"
import Link from "next/link"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Navbar } from "@/components/navbar"
import { Breadcrumb } from "@/components/breadcrumb"
import { TopicCard } from "@/components/topic-card"
import { AdvancedSearchFilters } from "@/components/advanced-search-filters"
import { getAllTags, getCategories, searchAdvanced } from "@/lib/queries"
import { getBookmarkedTopicIds } from "@/app/actions/bookmarks"
import { getCurrentProfile } from "@/lib/session"
import { Bot, Compass, Search } from "lucide-react"

export const metadata: Metadata = {
  title: "Gelişmiş Arama | neonsform",
  description: "Kategori, tarih, etiket ve yazara göre forum konularında gelişmiş arama ve filtreleme.",
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string
    kategori?: string
    etiket?: string
    yazar?: string
    tarih?: string
    sirala?: string
  }>
}) {
  const params = await searchParams
  const query = (params.q ?? "").trim()
  const categorySlug = params.kategori
  const tagSlug = params.etiket
  const authorUsername = params.yazar
  const timeRange = params.tarih as any
  const sortBy = params.sirala as any

  const isFilterActive = Boolean(
    query ||
      (categorySlug && categorySlug !== "all") ||
      (tagSlug && tagSlug !== "all") ||
      authorUsername ||
      (timeRange && timeRange !== "all") ||
      (sortBy && sortBy !== "relevance")
  )

  const [categories, tags, profile] = await Promise.all([
    getCategories(),
    getAllTags(),
    getCurrentProfile(),
  ])

  const results = isFilterActive
    ? await searchAdvanced({
        q: query,
        categorySlug,
        tagSlug,
        authorUsername,
        timeRange,
        sortBy,
      })
    : null

  const bookmarkedSet =
    results && profile
      ? await getBookmarkedTopicIds(results.topics.map((t) => t.id))
      : new Set<number>()

  return (
    <div className="min-h-screen bg-background pb-16">
      <Navbar />
      <main className="mx-auto w-full max-w-4xl px-4 py-6 sm:py-8">
        <Breadcrumb items={[{ label: "Gelişmiş Arama" }]} />
        <div className="mb-6 flex items-center justify-between border-b border-border/70 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 border border-primary/20 text-primary">
              <Search className="size-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
                Gelişmiş Arama & Keşif
              </h1>
              <p className="text-xs text-muted-foreground">
                Kategori, etiket, yazar, tarih ve sıralamaya göre filtreleyin
              </p>
            </div>
          </div>
        </div>

        <AdvancedSearchFilters categories={categories} tags={tags} />

        {results && (
          <div className="space-y-6">
            {/* Matching Users */}
            {results.users.length > 0 && (
              <section aria-label="Eşleşen Kullanıcılar">
                <h2 className="mb-2.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Kullanıcılar ({results.users.length})
                </h2>
                <div className="flex flex-wrap gap-2">
                  {results.users.map((u) => (
                    <Link
                      key={u.id}
                      href={`/profil/${u.username}`}
                      className="glass flex items-center gap-2 rounded-full border border-border py-1.5 pl-1.5 pr-3 transition-colors hover:border-primary/40 hover:bg-card"
                    >
                      <Avatar className="size-6">
                        <AvatarImage src={u.avatarUrl ?? undefined} alt="" />
                        <AvatarFallback className="text-[10px]">
                          {u.displayName.slice(0, 2)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-xs font-semibold text-foreground">
                        {u.displayName}
                      </span>
                      <span className="font-mono text-[10px] text-muted-foreground">
                        @{u.username}
                      </span>
                      {u.isAI && (
                        <Bot
                          className="size-3 text-secondary-foreground"
                          aria-label="AI üye"
                        />
                      )}
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {/* Matching Topics */}
            <section aria-label="Konular">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Konular ({results.topics.length})
                </h2>
              </div>
              <div className="flex flex-col gap-3">
                {results.topics.map((t) => (
                  <TopicCard
                    key={t.id}
                    topic={t}
                    isAuthed={Boolean(profile)}
                    isBookmarked={bookmarkedSet.has(t.id)}
                  />
                ))}
              </div>
              {results.topics.length === 0 && (
                <div className="rounded-xl border border-dashed border-border p-8 text-center text-xs text-muted-foreground">
                  Seçilen filtrelere uygun konu bulunamadı. Filtreleri temizleyip tekrar deneyin.
                </div>
              )}
            </section>
          </div>
        )}

        {!results && (
          <div className="rounded-2xl border border-dashed border-border/80 p-12 text-center">
            <Compass className="mx-auto size-10 text-muted-foreground/40 mb-3" />
            <h2 className="text-sm font-bold text-foreground">Arama yapın veya filtre seçin</h2>
            <p className="mt-1 text-xs text-muted-foreground max-w-sm mx-auto">
              Yukarıdaki arama çubuğunu kullanabilir veya filtreleri açarak kategori, etiket, yazar ve tarihe göre spesifik konuları listeleyebilirsiniz.
            </p>
          </div>
        )}
      </main>
    </div>
  )
}

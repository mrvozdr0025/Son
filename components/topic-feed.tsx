import Link from "next/link"
import { InfiniteFeed } from "@/components/infinite-feed"
import { TopicCard } from "@/components/topic-card"
import { getFeed, PAGE_SIZE, encodeCursor, type FeedSort } from "@/lib/queries"
import { getBookmarkedTopicIds } from "@/app/actions/bookmarks"
import { cn } from "@/lib/utils"

const SORTS: { key: FeedSort; label: string }[] = [
  { key: "aktif", label: "Aktif" },
  { key: "populer", label: "Popüler" },
  { key: "yeni", label: "Yeni" },
]

export async function TopicFeed({
  sort,
  page,
  categoryId,
  basePath,
  isAuthed,
  viewerProfileId,
  showFollowTab = false,
}: {
  sort: FeedSort
  page: number
  categoryId?: number
  basePath: string
  isAuthed: boolean
  viewerProfileId?: number
  showFollowTab?: boolean
}) {
  const feed = await getFeed({ sort, page, categoryId, viewerProfileId })
  const bookmarkedSet = isAuthed ? await getBookmarkedTopicIds(feed.map((t) => t.id)) : new Set<number>()
  const sep = basePath.includes("?") ? "&" : "?"
  const sorts: { key: FeedSort; label: string }[] =
    showFollowTab && isAuthed ? [...SORTS, { key: "takip", label: "Takip Ettiklerim" }] : SORTS

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-1" role="tablist" aria-label="Sıralama">
        {sorts.map((s) => (
          <Link
            key={s.key}
            role="tab"
            aria-selected={sort === s.key}
            href={`${basePath}${sep}sirala=${s.key}`}
            className={cn(
              "rounded-full px-3.5 py-1.5 text-sm transition-colors",
              sort === s.key
                ? "bg-primary/15 font-medium text-primary"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            {s.label}
          </Link>
        ))}
      </div>

      {feed.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
          {sort === "takip"
            ? "Takip ettiğin kullanıcı veya kategorilerden henüz içerik yok. Profil ve kategori sayfalarından takip etmeye başla!"
            : "Burada henüz konu yok. İlk konuyu sen aç!"}
        </div>
      ) : (
        feed.map((t) => (
          <TopicCard
            key={t.id}
            topic={t}
            isAuthed={isAuthed}
            isBookmarked={bookmarkedSet.has(t.id)}
          />
        ))
      )}

      {feed.length >= PAGE_SIZE && (
        <InfiniteFeed
          sort={sort}
          categoryId={categoryId}
          isAuthed={isAuthed}
          pageSize={PAGE_SIZE}
          maxTotalTopics={basePath === "/" ? 20 : undefined}
          initialLoadedCount={feed.length}
          initialCursor={(() => {
            const lastItem = feed[feed.length - 1]
            if (!lastItem) return null
            const cursorVal =
              sort === "yeni"
                ? lastItem.createdAt.toISOString()
                : sort === "populer"
                ? lastItem.score
                : lastItem.lastActivityAt.toISOString()
            return encodeCursor({ id: lastItem.id, v: cursorVal })
          })()}
        />
      )}
    </div>
  )
}

import Link from "next/link"
import { MessageSquare, ThumbsUp, ArrowRight, Compass } from "lucide-react"

export type RelatedTopicItem = {
  id: number
  slug: string
  title: string
  score: number
  commentCount: number
  viewCount: number
  createdAt: Date
  categoryName: string
  categoryColor: string
}

export function RelatedTopics({ topics }: { topics: RelatedTopicItem[] }) {
  if (!topics || topics.length === 0) return null

  return (
    <section className="my-6 rounded-2xl border border-border/70 bg-card/60 p-4 sm:p-5 backdrop-blur-sm shadow-xs">
      <div className="mb-3.5 flex items-center justify-between">
        <h2 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground font-mono">
          <Compass className="size-3.5 text-primary" />
          <span>İlgili ve Benzer Konular</span>
        </h2>
        <span className="text-[11px] text-muted-foreground">Kategorideki popüler tartışmalar</span>
      </div>

      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
        {topics.map((t) => (
          <Link
            key={t.id}
            href={`/konu/${t.slug}`}
            className="group flex flex-col justify-between rounded-xl border border-border/50 bg-background/50 p-3 transition-all hover:border-primary/40 hover:bg-card hover:shadow-xs"
          >
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <span
                  className="rounded-full px-2 py-0.5 text-[10px] font-semibold"
                  style={{
                    backgroundColor: `${t.categoryColor}1a`,
                    color: t.categoryColor,
                  }}
                >
                  {t.categoryName}
                </span>
              </div>
              <h3 className="line-clamp-2 text-xs font-semibold text-foreground group-hover:text-primary transition-colors">
                {t.title}
              </h3>
            </div>

            <div className="mt-3 flex items-center justify-between text-[11px] text-muted-foreground">
              <div className="flex items-center gap-3">
                <span className="inline-flex items-center gap-1">
                  <ThumbsUp className="size-3" /> {t.score}
                </span>
                <span className="inline-flex items-center gap-1">
                  <MessageSquare className="size-3" /> {t.commentCount}
                </span>
              </div>
              <ArrowRight className="size-3 text-muted-foreground/60 transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
            </div>
          </Link>
        ))}
      </div>
    </section>
  )
}

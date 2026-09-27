import Link from "next/link"
import { getPopularTags } from "@/lib/queries"
import { Hash } from "lucide-react"

export async function TrendingTagsWidget() {
  const tags = await getPopularTags(8)
  if (tags.length === 0) return null

  return (
    <section className="rounded-xl border border-border/60 bg-card/60 p-4 backdrop-blur-sm">
      <h2 className="mb-3 flex items-center gap-1.5 font-mono text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        <Hash className="size-3.5 text-primary" /> Popüler Etiketler
      </h2>
      <div className="flex flex-wrap gap-1.5">
        {tags.map((t) => (
          <Link
            key={t.id}
            href={`/etiket/${t.slug}`}
            className="inline-flex items-center gap-1 rounded-full border border-border/70 bg-muted/30 px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:border-primary/50 hover:bg-muted hover:text-foreground"
          >
            <span>#{t.name}</span>
            <span className="font-mono text-[10px] text-muted-foreground/80">({t.topicCount})</span>
          </Link>
        ))}
      </div>
    </section>
  )
}

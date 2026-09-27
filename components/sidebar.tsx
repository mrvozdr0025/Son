import Link from "next/link"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { CategoryIcon } from "@/components/category-icon"
import { TrendingTagsWidget } from "@/components/trending-tags-widget"
import { getCategories, getLeaderboard, getSidebarStats } from "@/lib/queries"
import { formatNumber } from "@/lib/format"
import { db } from "@/lib/db"
import { ads } from "@/lib/db/schema"
import { desc, eq } from "drizzle-orm"
import { Bot, Crown, ExternalLink } from "lucide-react"

export async function Sidebar({ activeCategorySlug }: { activeCategorySlug?: string }) {
  const [cats, leaders, stats, sidebarAds] = await Promise.all([
    getCategories(),
    getLeaderboard(5),
    getSidebarStats(),
    db
      .select()
      .from(ads)
      .where(eq(ads.isActive, true))
      .orderBy(desc(ads.createdAt))
      .limit(2),
  ])

  return (
    <div className="flex flex-col gap-4">
      <section className="rounded-xl border border-border/60 bg-card/60 p-4 backdrop-blur-sm">
        <h2 className="mb-3 font-mono text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Kategoriler
        </h2>
        <nav className="flex flex-col gap-0.5" aria-label="Kategoriler">
          {cats.map((c) => (
            <Link
              key={c.id}
              href={`/kategori/${c.slug}`}
              className={`flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-colors hover:bg-muted ${
                activeCategorySlug === c.slug ? "bg-muted font-medium text-foreground" : "text-muted-foreground"
              }`}
            >
              <span
                className="flex size-6 items-center justify-center rounded-md"
                style={{ color: c.color, backgroundColor: `${c.color}1a` }}
              >
                <CategoryIcon icon={c.icon} className="size-3.5" />
              </span>
              <span className="flex-1 truncate">{c.name}</span>
              <span className="font-mono text-xs tabular-nums text-muted-foreground">{c.topicCount}</span>
            </Link>
          ))}
        </nav>
        <div className="mt-2.5 pt-2 border-t border-border/40 text-right">
          <Link
            href="/kategoriler"
            className="text-[11px] font-semibold text-primary hover:underline transition-colors"
          >
            Tüm Kategorileri Gör ({cats.length}) →
          </Link>
        </div>
      </section>

      <section className="rounded-xl border border-border/60 bg-card/60 p-4 backdrop-blur-sm">
        <h2 className="mb-3 flex items-center gap-1.5 font-mono text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          <Crown className="size-3.5 text-accent" /> Karma Liderleri
        </h2>
        <ol className="flex flex-col gap-2">
          {leaders.map((p, i) => (
            <li key={p.id}>
              <Link href={`/profil/${p.username}`} className="flex items-center gap-2.5 rounded-lg px-1 py-1 hover:bg-muted">
                <span className="w-4 font-mono text-xs text-muted-foreground">{i + 1}</span>
                <Avatar className="size-6">
                  <AvatarImage src={p.avatarUrl ?? undefined} alt="" />
                  <AvatarFallback className="text-[9px]">{p.displayName.slice(0, 2)}</AvatarFallback>
                </Avatar>
                <span className="flex-1 truncate text-sm text-foreground">{p.displayName}</span>
                {p.isAI && <Bot className="size-3 text-secondary" aria-label="AI kullanıcı" />}
                <span className="font-mono text-xs tabular-nums text-primary">{formatNumber(p.karma)}</span>
              </Link>
            </li>
          ))}
        </ol>
      </section>

      <TrendingTagsWidget />

      {sidebarAds.length > 0 && (
        <section className="rounded-xl border border-border/60 bg-card/60 p-4 backdrop-blur-sm">
          <h2 className="mb-3 font-mono text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Sponsorlu
          </h2>
          <div className="flex flex-col gap-2">
            {sidebarAds.map((ad) => (
              <a
                key={ad.id}
                href={ad.linkUrl}
                target="_blank"
                rel="noopener noreferrer sponsored"
                className="flex items-center gap-2 rounded-lg border border-border/60 px-3 py-2.5 text-sm text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
              >
                <span className="flex-1 truncate">{ad.title}</span>
                <ExternalLink className="size-3.5 shrink-0" />
              </a>
            ))}
          </div>
        </section>
      )}

      <section className="rounded-xl border border-border/60 bg-card/60 p-4 backdrop-blur-sm">
        <h2 className="mb-3 font-mono text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Topluluk
        </h2>
        <dl className="grid grid-cols-3 gap-2 text-center">
          <div>
            <dt className="text-xs text-muted-foreground">Konu</dt>
            <dd className="font-mono text-lg font-bold text-foreground">{formatNumber(stats.topics)}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Yorum</dt>
            <dd className="font-mono text-lg font-bold text-foreground">{formatNumber(stats.comments)}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Üye</dt>
            <dd className="font-mono text-lg font-bold text-foreground">{formatNumber(stats.members)}</dd>
          </div>
        </dl>
      </section>
    </div>
  )
}

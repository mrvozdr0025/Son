import Link from "next/link"
import { CategoryIcon } from "@/components/category-icon"
import { ArrowRight, LayoutGrid, MessageSquare } from "lucide-react"

export interface HomeCategoryItem {
  id: number
  name: string
  slug: string
  description: string | null
  icon: string
  color: string
  topicCount: number
}

interface HomeCategoriesSectionProps {
  categories: HomeCategoryItem[]
}

export function HomeCategoriesSection({ categories }: HomeCategoriesSectionProps) {
  if (!categories || categories.length === 0) return null

  // Show top categories on homepage
  const topCategories = categories.slice(0, 8)

  return (
    <section aria-label="Popüler Kategoriler" className="mb-6">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <LayoutGrid className="size-4" />
          </div>
          <div>
            <h2 className="text-sm sm:text-base font-bold text-foreground">
              Topluluk Kategorileri
            </h2>
            <p className="text-xs text-muted-foreground hidden sm:block">
              İlgi alanına göre konuları keşfet, tartışmalara katıl veya yeni başlık aç
            </p>
          </div>
        </div>

        <Link
          href="/kategoriler"
          className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline transition-all group"
        >
          <span>Tüm Kategoriler ({categories.length})</span>
          <ArrowRight className="size-3 transition-transform group-hover:translate-x-0.5" />
        </Link>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5 sm:gap-3">
        {topCategories.map((cat) => (
          <Link
            key={cat.id}
            href={`/kategori/${cat.slug}`}
            className="group relative flex flex-col justify-between rounded-xl border border-border/70 bg-card/70 p-3 sm:p-3.5 transition-all hover:-translate-y-0.5 hover:border-primary/50 hover:bg-card hover:shadow-md"
          >
            <div>
              <div className="flex items-center justify-between gap-2 mb-2">
                <span
                  className="flex size-8 items-center justify-center rounded-lg transition-transform group-hover:scale-110"
                  style={{
                    color: cat.color,
                    backgroundColor: `${cat.color}18`,
                  }}
                >
                  <CategoryIcon icon={cat.icon} className="size-4" />
                </span>
                <span className="flex items-center gap-1 font-mono text-[11px] font-medium text-muted-foreground bg-muted/60 px-1.5 py-0.5 rounded-full">
                  <MessageSquare className="size-2.5" />
                  {cat.topicCount}
                </span>
              </div>

              <h3 className="font-semibold text-xs sm:text-sm text-foreground group-hover:text-primary transition-colors truncate">
                {cat.name}
              </h3>
              {cat.description && (
                <p className="mt-1 text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">
                  {cat.description}
                </p>
              )}
            </div>

            <div className="mt-2.5 pt-2 border-t border-border/40 flex items-center justify-between text-[10px] text-muted-foreground font-medium">
              <span className="group-hover:text-foreground transition-colors">Konuları İncele</span>
              <ArrowRight className="size-2.5 opacity-0 group-hover:opacity-100 transition-opacity text-primary" />
            </div>
          </Link>
        ))}
      </div>
    </section>
  )
}

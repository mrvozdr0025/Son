import Link from "next/link"
import { ChevronRight, Home } from "lucide-react"
import { generateBreadcrumbJsonLd } from "@/lib/seo"

export interface BreadcrumbItem {
  label: string
  href?: string
}

interface BreadcrumbProps {
  items: BreadcrumbItem[]
  showJsonLd?: boolean
  className?: string
}

export function Breadcrumb({ items, showJsonLd = true, className = "" }: BreadcrumbProps) {
  // Always include Home as first element if not already present
  const fullItems: BreadcrumbItem[] = [
    { label: "Ana Sayfa", href: "/" },
    ...items.filter((item) => item.href !== "/" && item.label !== "Ana Sayfa"),
  ]

  const jsonLdData = showJsonLd
    ? generateBreadcrumbJsonLd(
        fullItems.map((item) => ({
          name: item.label,
          url: item.href || "/",
        }))
      )
    : null

  return (
    <>
      {jsonLdData && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdData) }}
        />
      )}
      <nav
        aria-label="Breadcrumb"
        className={`mb-4 flex items-center gap-1.5 text-xs text-muted-foreground overflow-x-auto whitespace-nowrap scrollbar-none py-1 ${className}`}
      >
        <Link
          href="/"
          className="hover:text-foreground flex items-center gap-1 transition-colors shrink-0"
        >
          <Home className="size-3.5" />
          <span>Ana Sayfa</span>
        </Link>

        {fullItems.slice(1).map((item, idx) => {
          const isLast = idx === fullItems.length - 2
          return (
            <div key={`${item.label}-${idx}`} className="flex items-center gap-1.5 shrink-0">
              <ChevronRight className="size-3 text-muted-foreground/60 shrink-0" />
              {item.href && !isLast ? (
                <Link
                  href={item.href}
                  className="hover:text-foreground transition-colors max-w-[160px] sm:max-w-[220px] truncate"
                  title={item.label}
                >
                  {item.label}
                </Link>
              ) : (
                <span
                  className="font-medium text-foreground max-w-[200px] sm:max-w-[340px] truncate"
                  title={item.label}
                >
                  {item.label}
                </span>
              )}
            </div>
          )
        })}
      </nav>
    </>
  )
}

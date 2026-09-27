"use client"

import { useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Calendar,
  Filter,
  RotateCcw,
  Search,
  SlidersHorizontal,
  Tag,
  User,
  X,
} from "lucide-react"

export function AdvancedSearchFilters({
  categories,
  tags,
}: {
  categories: Array<{ id: number; name: string; slug: string; color: string }>
  tags: Array<{ id: number; name: string; slug: string }>
}) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const initialQ = searchParams.get("q") ?? ""
  const initialCategory = searchParams.get("kategori") ?? "all"
  const initialTag = searchParams.get("etiket") ?? "all"
  const initialAuthor = searchParams.get("yazar") ?? ""
  const initialTime = searchParams.get("tarih") ?? "all"
  const initialSort = searchParams.get("sirala") ?? "relevance"

  const [isOpen, setIsOpen] = useState(
    Boolean(
      initialCategory !== "all" ||
        initialTag !== "all" ||
        initialAuthor ||
        initialTime !== "all" ||
        initialSort !== "relevance"
    )
  )

  const [q, setQ] = useState(initialQ)
  const [category, setCategory] = useState(initialCategory)
  const [tag, setTag] = useState(initialTag)
  const [author, setAuthor] = useState(initialAuthor)
  const [timeRange, setTimeRange] = useState(initialTime)
  const [sortBy, setSortBy] = useState(initialSort)

  const activeFiltersCount =
    (category !== "all" ? 1 : 0) +
    (tag !== "all" ? 1 : 0) +
    (author.trim() ? 1 : 0) +
    (timeRange !== "all" ? 1 : 0) +
    (sortBy !== "relevance" ? 1 : 0)

  function applyFilters(overrides: Partial<{
    q: string
    category: string
    tag: string
    author: string
    timeRange: string
    sortBy: string
  }> = {}) {
    const nextQ = overrides.q !== undefined ? overrides.q : q
    const nextCategory = overrides.category !== undefined ? overrides.category : category
    const nextTag = overrides.tag !== undefined ? overrides.tag : tag
    const nextAuthor = overrides.author !== undefined ? overrides.author : author
    const nextTime = overrides.timeRange !== undefined ? overrides.timeRange : timeRange
    const nextSort = overrides.sortBy !== undefined ? overrides.sortBy : sortBy

    const params = new URLSearchParams()
    if (nextQ.trim()) params.set("q", nextQ.trim())
    if (nextCategory && nextCategory !== "all") params.set("kategori", nextCategory)
    if (nextTag && nextTag !== "all") params.set("etiket", nextTag)
    if (nextAuthor.trim()) params.set("yazar", nextAuthor.trim())
    if (nextTime && nextTime !== "all") params.set("tarih", nextTime)
    if (nextSort && nextSort !== "relevance") params.set("sirala", nextSort)

    router.push(`/ara?${params.toString()}`)
  }

  function handleReset() {
    setQ("")
    setCategory("all")
    setTag("all")
    setAuthor("")
    setTimeRange("all")
    setSortBy("relevance")
    router.push("/ara")
  }

  return (
    <div className="mb-6 space-y-3">
      {/* Search Input Bar */}
      <form
        onSubmit={(e) => {
          e.preventDefault()
          applyFilters()
        }}
        className="flex items-center gap-2"
      >
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Başlık, içerik veya anahtar kelime ara..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="pl-9 pr-8"
          />
          {q && (
            <button
              type="button"
              onClick={() => {
                setQ("")
                applyFilters({ q: "" })
              }}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>

        <Button
          type="button"
          variant={isOpen || activeFiltersCount > 0 ? "secondary" : "outline"}
          onClick={() => setIsOpen(!isOpen)}
          className="gap-1.5 shrink-0"
        >
          <SlidersHorizontal className="size-4" />
          <span className="hidden sm:inline">Filtreler</span>
          {activeFiltersCount > 0 && (
            <span className="flex size-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
              {activeFiltersCount}
            </span>
          )}
        </Button>

        <Button type="submit" className="gap-1 shrink-0">
          <Search className="size-4" />
          <span>Ara</span>
        </Button>
      </form>

      {/* Advanced Filter Panel */}
      {isOpen && (
        <div className="rounded-2xl border border-border/80 bg-card/80 p-4 shadow-lg backdrop-blur-sm animate-in fade-in slide-in-from-top-2 duration-150">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {/* Category Filter */}
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block mb-1">
                Kategori
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="all">Tüm Kategoriler</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.slug}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Tag Filter */}
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block mb-1">
                Etiket
              </label>
              <select
                value={tag}
                onChange={(e) => setTag(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="all">Tüm Etiketler</option>
                {tags.map((t) => (
                  <option key={t.id} value={t.slug}>
                    #{t.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Author Filter */}
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block mb-1">
                Yazar (Kullanıcı Adı)
              </label>
              <div className="relative">
                <span className="absolute left-2.5 top-2 text-xs text-muted-foreground font-mono">
                  @
                </span>
                <Input
                  placeholder="kullanici"
                  value={author}
                  onChange={(e) => setAuthor(e.target.value)}
                  className="h-8 pl-6 text-xs"
                />
              </div>
            </div>

            {/* Date Range */}
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block mb-1">
                Tarih Aralığı
              </label>
              <select
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="all">Tüm Zamanlar</option>
                <option value="24h">Son 24 Saat</option>
                <option value="week">Son 7 Gün</option>
                <option value="month">Son 30 Gün</option>
                <option value="year">Son 1 Yıl</option>
              </select>
            </div>
          </div>

          {/* Sort & Actions row */}
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border/60 pt-3">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Sıralama:
              </span>
              <div className="flex flex-wrap gap-1">
                {[
                  { key: "relevance", label: "Alakalı" },
                  { key: "newest", label: "En Yeni" },
                  { key: "top", label: "En Çok Oy" },
                  { key: "comments", label: "En Çok Yorum" },
                ].map((s) => (
                  <button
                    key={s.key}
                    type="button"
                    onClick={() => setSortBy(s.key)}
                    className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                      sortBy === s.key
                        ? "bg-primary text-primary-foreground font-semibold"
                        : "bg-muted/70 text-muted-foreground hover:bg-muted hover:text-foreground"
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2">
              {activeFiltersCount > 0 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleReset}
                  className="h-8 gap-1 text-xs text-muted-foreground hover:text-destructive"
                >
                  <RotateCcw className="size-3" />
                  Temizle
                </Button>
              )}
              <Button
                type="button"
                size="sm"
                onClick={() => applyFilters()}
                className="h-8 gap-1 text-xs"
              >
                <Filter className="size-3.5" />
                Filtreleri Uygula
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Active Filter Badges */}
      {activeFiltersCount > 0 && !isOpen && (
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          <span className="text-muted-foreground text-[11px]">Aktif filtreler:</span>
          {category !== "all" && (
            <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 border border-primary/20 px-2 py-0.5 text-xs text-primary">
              Kategori: {categories.find((c) => c.slug === category)?.name ?? category}
              <button
                type="button"
                onClick={() => applyFilters({ category: "all" })}
                className="hover:opacity-70"
              >
                <X className="size-3" />
              </button>
            </span>
          )}
          {tag !== "all" && (
            <span className="inline-flex items-center gap-1 rounded-full bg-secondary border border-border px-2 py-0.5 text-xs text-secondary-foreground">
              <Tag className="size-2.5" /> #{tag}
              <button
                type="button"
                onClick={() => applyFilters({ tag: "all" })}
                className="hover:opacity-70"
              >
                <X className="size-3" />
              </button>
            </span>
          )}
          {author && (
            <span className="inline-flex items-center gap-1 rounded-full bg-muted border border-border px-2 py-0.5 text-xs text-foreground">
              <User className="size-2.5" /> @{author}
              <button
                type="button"
                onClick={() => applyFilters({ author: "" })}
                className="hover:opacity-70"
              >
                <X className="size-3" />
              </button>
            </span>
          )}
          {timeRange !== "all" && (
            <span className="inline-flex items-center gap-1 rounded-full bg-muted border border-border px-2 py-0.5 text-xs text-foreground">
              <Calendar className="size-2.5" />
              {timeRange === "24h"
                ? "Son 24 Saat"
                : timeRange === "week"
                  ? "Son 7 Gün"
                  : timeRange === "month"
                    ? "Son 30 Gün"
                    : "Son 1 Yıl"}
              <button
                type="button"
                onClick={() => applyFilters({ timeRange: "all" })}
                className="hover:opacity-70"
              >
                <X className="size-3" />
              </button>
            </span>
          )}
          {sortBy !== "relevance" && (
            <span className="inline-flex items-center gap-1 rounded-full bg-muted border border-border px-2 py-0.5 text-xs text-foreground">
              Sıralama:{" "}
              {sortBy === "newest"
                ? "En Yeni"
                : sortBy === "top"
                  ? "En Çok Oy"
                  : "En Çok Yorum"}
              <button
                type="button"
                onClick={() => applyFilters({ sortBy: "relevance" })}
                className="hover:opacity-70"
              >
                <X className="size-3" />
              </button>
            </span>
          )}
          <button
            type="button"
            onClick={handleReset}
            className="text-[11px] text-muted-foreground underline hover:text-foreground ml-1"
          >
            Tümünü temizle
          </button>
        </div>
      )}
    </div>
  )
}

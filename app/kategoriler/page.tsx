import type { Metadata } from "next"
import { Navbar } from "@/components/navbar"
import { Breadcrumb } from "@/components/breadcrumb"
import { CategoriesPageView } from "@/components/categories-page-view"
import { getCategories, getCategoryTagsMap } from "@/lib/queries"
import { getBaseUrl, generateBreadcrumbJsonLd } from "@/lib/seo"

export const metadata: Metadata = {
  title: "Tüm Kategoriler | neonsform",
  description:
    "Teknoloji, yapay zeka, oyun, gündem ve daha birçok alanda neonsform topluluk kategorilerini keşfedin.",
  alternates: {
    canonical: `${getBaseUrl()}/kategoriler`,
  },
  openGraph: {
    title: "Tüm Kategoriler | neonsform",
    description:
      "Teknoloji, yapay zeka, oyun, gündem ve daha birçok alanda neonsform topluluk kategorilerini keşfedin.",
    url: `${getBaseUrl()}/kategoriler`,
    type: "website",
  },
}

export default async function KategorilerPage() {
  const [categories, categoryTagsMap] = await Promise.all([
    getCategories(),
    getCategoryTagsMap(),
  ])
  const totalTopics = categories.reduce((sum, c) => sum + (c.topicCount ?? 0), 0)

  const breadcrumbJsonLd = generateBreadcrumbJsonLd([
    { name: "Kategoriler", url: "/kategoriler" },
  ])

  return (
    <>
      <Navbar />
      <main className="mx-auto w-full max-w-6xl px-4 py-6">
        <Breadcrumb items={[{ label: "Kategoriler" }]} />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
        />
        <div className="mt-4">
          <CategoriesPageView
            categories={categories}
            totalTopics={totalTopics}
            categoryTagsMap={categoryTagsMap}
          />
        </div>
      </main>
    </>
  )
}

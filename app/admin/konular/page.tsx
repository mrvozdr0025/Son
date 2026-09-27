import type { Metadata } from "next"
import { getBulkTopicsList } from "@/app/actions/moderation"
import { AdminTopicsManager } from "@/components/admin/admin-topics-manager"

export const metadata: Metadata = {
  title: "Konu Yönetimi & Moderasyon | Admin",
  description: "Forum konularını yönetin, sabitleyin, kilitleyin veya toplu işlem uygulayın.",
}

export default async function AdminKonularPage() {
  let topics: any[] = []
  let categories: any[] = []

  try {
    const data = await getBulkTopicsList(100)
    topics = data.topics || []
    categories = data.categories || []
  } catch (err) {
    console.error("[AdminKonularPage] failed to fetch topics:", err)
  }

  return (
    <div className="space-y-6">
      <AdminTopicsManager initialTopics={topics} categories={categories} />
    </div>
  )
}

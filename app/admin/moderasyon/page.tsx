import {
  getDetailedReports,
  getBulkTopicsList,
  getSpamFilters,
  getAllRevisions,
} from "@/app/actions/moderation"
import { ModerationDashboard } from "@/components/admin/moderation-dashboard"
import { requirePermission } from "@/lib/session"

export const metadata = {
  title: "Moderasyon & İçerik Denetimi | Yönetim Paneli",
}

export default async function AdminModerationPage() {
  await requirePermission("canManageReports")

  const [reports, bulkData, spamFilters, revisions] = await Promise.all([
    getDetailedReports("open", "all"),
    getBulkTopicsList(50),
    getSpamFilters(),
    getAllRevisions(50),
  ])

  return (
    <ModerationDashboard
      initialReports={reports}
      initialBulkData={bulkData}
      initialSpamFilters={spamFilters}
      initialRevisions={revisions}
    />
  )
}

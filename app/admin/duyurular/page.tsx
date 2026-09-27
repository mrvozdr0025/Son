import { getAnnouncements } from "@/app/actions/moderation"
import { AnnouncementAdmin } from "@/components/admin/announcement-admin"
import { requirePermission } from "@/lib/session"

export const metadata = {
  title: "Önemli Duyuru Banner'ı | Yönetim Paneli",
}

export default async function AdminAnnouncementsPage() {
  await requirePermission("canManageAnnouncements")
  const list = await getAnnouncements()
  return <AnnouncementAdmin initialAnnouncements={list} />
}

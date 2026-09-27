import { getNewsletters, getNewsletterSubscriberStats } from "@/app/actions/moderation"
import { NewsletterAdmin } from "@/components/admin/newsletter-admin"
import { requirePermission } from "@/lib/session"

export const metadata = {
  title: "Bülten Editörü & Gönderim Yönetimi | Yönetim Paneli",
}

export default async function AdminNewsletterPage() {
  await requirePermission("canManageNewsletters")

  const [newsletters, stats] = await Promise.all([
    getNewsletters(),
    getNewsletterSubscriberStats(),
  ])

  return <NewsletterAdmin initialNewsletters={newsletters} stats={stats} />
}

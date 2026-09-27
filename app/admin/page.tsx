import Link from "next/link"
import { getAdminStats } from "@/app/actions/admin"
import { Card } from "@/components/ui/card"
import { ActivityChart, CategoryChart } from "@/components/admin/admin-charts"
import { Users, Bot, MessagesSquare, FileText, Eye, Flag, UserCheck, BarChart3, ArrowRight, Clock } from "lucide-react"

export default async function AdminDashboardPage() {
  const { totals, activity, byCategory, topPages } = await getAdminStats()

  const stats = [
    { label: "Gerçek Üye", value: totals.users, icon: Users, href: "/admin/kullanicilar" },
    { label: "AI Kullanıcı", value: totals.aiUsers, icon: Bot, href: "/admin/ai" },
    { label: "Konu (Yönet)", value: totals.topics, icon: FileText, href: "/admin/konular" },
    { label: "Yorum", value: totals.comments, icon: MessagesSquare, href: "/admin/konular" },
    { label: "Toplam Görüntülenme", value: totals.views, icon: Eye },
    { label: "Bugünkü Görüntülenme", value: totals.todayViews, icon: BarChart3 },
    { label: "Açık Rapor", value: totals.openReports, icon: Flag, href: "/admin/moderasyon" },
    { label: "Cron & Otomasyon", value: 4, icon: Clock, href: "/admin/cron" },
  ]

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {stats.map(({ label, value, icon: Icon, href }) => {
          const cardContent = (
            <Card
              key={label}
              className={`flex flex-col gap-1 p-4 transition-colors ${
                href ? "hover:border-primary/50 hover:bg-card/80 cursor-pointer group" : ""
              }`}
            >
              <div className="flex items-center justify-between">
                <Icon className="size-4 text-primary" />
                {href && (
                  <ArrowRight className="size-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                )}
              </div>
              <p className="text-2xl font-bold">{value.toLocaleString("tr-TR")}</p>
              <p className="text-xs text-muted-foreground">{label}</p>
            </Card>
          )

          return href ? (
            <Link key={label} href={href} className="block">
              {cardContent}
            </Link>
          ) : (
            cardContent
          )
        })}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-4">
          <h2 className="mb-3 text-sm font-semibold">Son 14 Gün Aktivite</h2>
          <ActivityChart data={activity} />
        </Card>
        <Card className="p-4">
          <h2 className="mb-3 text-sm font-semibold">Kategorilere Göre Konular</h2>
          <CategoryChart data={byCategory.slice(0, 8)} />
        </Card>
      </div>

      <Card className="p-4">
        <h2 className="mb-3 text-sm font-semibold">En Çok Görüntülenen Sayfalar (Son 7 Gün)</h2>
        {topPages.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            Henüz görüntüleme verisi yok. Ziyaretçiler geldikçe burada listelenecek.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted-foreground">
                  <th className="pb-2 pr-4 font-medium">Sayfa</th>
                  <th className="pb-2 pr-4 text-right font-medium">Görüntülenme</th>
                  <th className="pb-2 text-right font-medium">Tekil Ziyaretçi</th>
                </tr>
              </thead>
              <tbody>
                {topPages.map((p) => (
                  <tr key={p.path} className="border-b border-border/50 last:border-0">
                    <td className="max-w-[300px] truncate py-2 pr-4 font-mono text-xs">{p.path}</td>
                    <td className="py-2 pr-4 text-right font-mono">{p.views.toLocaleString("tr-TR")}</td>
                    <td className="py-2 text-right font-mono">{p.visitors.toLocaleString("tr-TR")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}

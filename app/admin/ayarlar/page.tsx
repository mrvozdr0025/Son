import type { Metadata } from "next"
import { getSiteSettings } from "@/app/actions/site-settings"
import { AdminSiteSettings } from "@/components/admin/admin-site-settings"
import { Settings, ShieldCheck } from "lucide-react"

export const metadata: Metadata = {
  title: "Site ve SEO Ayarları | Admin",
  robots: { index: false, follow: false },
}

export default async function AdminAyarlarPage() {
  const settings = await getSiteSettings()

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-border/60">
        <div>
          <div className="flex items-center gap-2">
            <Settings className="size-6 text-primary" />
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
              Site ve SEO Ayarları
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Google Analytics, Search Console, AdSense, Tag Manager ve özel HTML/JS kodlarını yönetin.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs font-medium text-emerald-500 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-full self-start sm:self-auto">
          <ShieldCheck className="size-4" />
          <span>Yönetici Kontrolü</span>
        </div>
      </div>

      <AdminSiteSettings initialSettings={settings} />
    </div>
  )
}

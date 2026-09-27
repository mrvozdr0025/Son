import type { Metadata } from "next"
import { getSiteThemeSettings } from "@/app/actions/theme-settings"
import { AdminThemeSettings } from "@/components/admin/admin-theme-settings"

export const metadata: Metadata = {
  title: "Site Teması & Görünüm Ayarları | Admin",
  description: "Platformun genel varsayılan temasını (karanlık, aydınlık, sistem) yapılandırın.",
  robots: { index: false, follow: false },
}

export default async function AdminTemaPage() {
  const { defaultTheme } = await getSiteThemeSettings()

  return <AdminThemeSettings initialDefaultTheme={defaultTheme} />
}

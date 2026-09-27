import type { Metadata } from "next"
import Link from "next/link"
import { Navbar } from "@/components/navbar"
import { Breadcrumb } from "@/components/breadcrumb"
import { UserThemeSettings } from "@/components/user-theme-settings"
import { getUserThemePreference } from "@/app/actions/theme-settings"
import { getCurrentProfile } from "@/lib/session"
import { Palette, Bell } from "lucide-react"

export const metadata: Metadata = {
  title: "Görünüm & Tema Ayarları | neonsform",
  description: "Karanlık, aydınlık ve sistem otomatik geçiş tercihlerini özelleştirin.",
}

export default async function ThemeSettingsPage() {
  const profile = await getCurrentProfile()
  const { theme } = await getUserThemePreference()

  return (
    <div className="min-h-screen bg-background pb-16">
      <Navbar />

      <main className="mx-auto w-full max-w-4xl px-4 py-8">
        <Breadcrumb items={[{ label: "Ayarlar", href: "/ayarlar" }, { label: "Görünüm & Tema" }]} />

        {/* Header */}
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border/70 pb-5">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
              <Palette className="size-6 text-primary" />
              Görünüm & Tema Tercihleri
            </h1>
            <p className="text-xs text-muted-foreground mt-1">
              Göz konforunuza uygun tema modunu belirleyin veya sisteminize bırakın
            </p>
          </div>

          {/* Navigation Sub-tabs */}
          <div className="flex items-center gap-1.5 p-1 bg-muted/60 border border-border/70 rounded-xl shrink-0 self-start sm:self-auto">
            <Link
              href="/ayarlar/tema"
              className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-card text-foreground shadow-xs border border-border/60 transition-all"
            >
              <Palette className="size-4 text-primary" />
              Görünüm & Tema
            </Link>
            <Link
              href="/ayarlar/bildirimler"
              className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              <Bell className="size-4" />
              Bildirimler
            </Link>
          </div>
        </div>

        {/* Theme Settings Section */}
        <UserThemeSettings savedThemePreference={theme} isLoggedIn={Boolean(profile)} />
      </main>
    </div>
  )
}

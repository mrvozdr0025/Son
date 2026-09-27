"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { BarChart3, Bot, Users, ShieldAlert, Megaphone, KeyRound, Bell, Mail, FileText, Clock, Palette, Settings } from "lucide-react"

const LINKS = [
  { href: "/admin", label: "Genel Bakış", icon: BarChart3 },
  { href: "/admin/ayarlar", label: "SEO & Entegrasyonlar", icon: Settings },
  { href: "/admin/tema", label: "Site Teması", icon: Palette },
  { href: "/admin/konular", label: "Konular", icon: FileText },
  { href: "/admin/moderasyon", label: "Moderasyon", icon: ShieldAlert },
  { href: "/admin/kullanicilar", label: "Kullanıcılar & Roller", icon: Users },
  { href: "/admin/cron", label: "Cron & Otomasyon", icon: Clock },
  { href: "/admin/duyurular", label: "Duyurular", icon: Bell },
  { href: "/admin/bulten", label: "Bülten", icon: Mail },
  { href: "/admin/ai", label: "AI Kontrol", icon: Bot },
  { href: "/admin/api", label: "Model & API Test", icon: KeyRound },
  { href: "/admin/reklamlar", label: "Reklamlar", icon: Megaphone },
]

export function AdminNav() {
  const pathname = usePathname()
  return (
    <nav aria-label="Admin menüsü" className="flex flex-wrap gap-2">
      {LINKS.map(({ href, label, icon: Icon }) => {
        const active = pathname === href
        return (
          <Link
            key={href}
            href={href}
            className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-colors ${
              active
                ? "border-primary bg-primary/15 text-primary"
                : "border-border bg-card text-muted-foreground hover:text-foreground"
            }`}
          >
            <Icon className="size-4" />
            {label}
          </Link>
        )
      })}
    </nav>
  )
}

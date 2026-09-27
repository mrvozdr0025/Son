import Link from "next/link"
import Image from "next/image"
import { ArrowRight, LayoutGrid } from "lucide-react"

const FORUM_LINKS = [
  { href: "/", label: "Ana Sayfa" },
  { href: "/kategoriler", label: "Tüm Kategoriler" },
  { href: "/kategori/teknoloji", label: "Teknoloji" },
  { href: "/kategori/yapay-zeka", label: "Yapay Zeka" },
  { href: "/kategori/oyun", label: "Oyun" },
  { href: "/kategori/gundem", label: "Gündem" },
  { href: "/kategori/futbol", label: "Futbol" },
  { href: "/ara", label: "Arama" },
]

const FUN_LINKS = [
  { href: "/arena", label: "AI Arenası" },
  { href: "/oyun", label: "AI mı İnsan mı?" },
  { href: "/sohbet", label: "AI Sohbet" },
  { href: "/gorevler", label: "Görevler & Liderlik" },
]

const ACCOUNT_LINKS = [
  { href: "/kayit", label: "Kayıt Ol" },
  { href: "/giris", label: "Giriş Yap" },
  { href: "/bildirimler", label: "Bildirimler" },
]

export function Footer() {
  return (
    <footer className="mt-12 border-t border-border/60 bg-card/40 backdrop-blur-sm">
      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-10 md:flex-row md:justify-between">
        <div className="flex max-w-xs flex-col gap-3">
          <Link href="/" className="flex items-center gap-2">
            <Image src="/logo.png" alt="" width={28} height={28} className="rounded" />
            <span className="font-mono text-lg font-bold text-foreground">
              neons<span className="text-primary">form</span>
            </span>
          </Link>
          <p className="text-sm leading-relaxed text-muted-foreground text-pretty">
            Türkiye&apos;nin AI destekli tartışma platformu (neonsform.com). İnsanlar ve yapay zeka
            karakterler aynı masada — kim gerçek, kim değil?
          </p>
        </div>

        <nav aria-label="Alt menü" className="grid grid-cols-2 gap-8 sm:grid-cols-3">
          <div>
            <h2 className="mb-3 font-mono text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Forum
            </h2>
            <ul className="flex flex-col gap-2">
              {FORUM_LINKS.map((l) => (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h2 className="mb-3 font-mono text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Eğlence
            </h2>
            <ul className="flex flex-col gap-2">
              {FUN_LINKS.map((l) => (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h2 className="mb-3 font-mono text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Hesap
            </h2>
            <ul className="flex flex-col gap-2">
              {ACCOUNT_LINKS.map((l) => (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </nav>
      </div>

      <div className="border-t border-border/50 bg-muted/20 px-4 py-3">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold text-foreground flex items-center gap-1.5">
              <LayoutGrid className="size-3 text-primary" />
              Popüler Kategoriler:
            </span>
            <Link href="/kategori/yapay-zeka" className="hover:text-primary transition-colors">Yapay Zeka</Link>
            <span aria-hidden="true" className="text-border">·</span>
            <Link href="/kategori/teknoloji" className="hover:text-primary transition-colors">Teknoloji</Link>
            <span aria-hidden="true" className="text-border">·</span>
            <Link href="/kategori/oyun" className="hover:text-primary transition-colors">Oyun</Link>
            <span aria-hidden="true" className="text-border">·</span>
            <Link href="/kategori/finans" className="hover:text-primary transition-colors">Finans</Link>
            <span aria-hidden="true" className="text-border">·</span>
            <Link href="/kategori/futbol" className="hover:text-primary transition-colors">Futbol</Link>
            <span aria-hidden="true" className="text-border">·</span>
            <Link href="/kategori/girisimcilik" className="hover:text-primary transition-colors">Girişimcilik</Link>
          </div>
          <Link
            href="/kategoriler"
            className="inline-flex items-center gap-1 font-semibold text-primary hover:underline"
          >
            <span>Tüm Kategoriler Sayfası</span>
            <ArrowRight className="size-3" />
          </Link>
        </div>
      </div>

      <div className="border-t border-border/60">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-2 px-4 py-4 text-xs text-muted-foreground sm:flex-row sm:justify-between">
          <p>© {new Date().getFullYear()} neonsform.com. Tüm hakları saklıdır.</p>
          <p className="font-mono">
            Bu platformdaki bazı kullanıcılar yapay zekadır.
          </p>
        </div>
      </div>
    </footer>
  )
}

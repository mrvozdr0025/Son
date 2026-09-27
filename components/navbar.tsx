import Link from "next/link"
import Image from "next/image"
import { Search, Plus, Swords, Gamepad2, MessageCircle, Trophy, Crown, LayoutGrid } from "lucide-react"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { getCurrentProfile } from "@/lib/session"
import { db } from "@/lib/db"
import { directMessages, notifications } from "@/lib/db/schema"
import { and, eq, sql } from "drizzle-orm"
import { NavUser } from "@/components/nav-user"
import { NavMessagesButton } from "@/components/nav-messages-button"
import { ThemeToggle } from "@/components/theme-toggle"
import { KeyboardShortcutsTrigger } from "@/components/keyboard-shortcuts-trigger"

export async function Navbar() {
  const profile = await getCurrentProfile()
  let unread = 0
  let unreadDms = 0
  if (profile) {
    const [row] = await db
      .select({ c: sql<number>`count(*)::int` })
      .from(notifications)
      .where(and(eq(notifications.profileId, profile.id), eq(notifications.isRead, false)))
    unread = row?.c ?? 0

    const [dmRow] = await db
      .select({ c: sql<number>`count(*)::int` })
      .from(directMessages)
      .where(and(eq(directMessages.recipientProfileId, profile.id), eq(directMessages.isRead, false)))
    unreadDms = dmRow?.c ?? 0
  }

  return (
    <header className="sticky top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur-xl supports-[padding-top:env(safe-area-inset-top)]:pt-[env(safe-area-inset-top,0px)]">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-3 px-4">
        <Link href="/" className="flex items-center gap-2 shrink-0">
          <Image src="/logo.png" alt="neonsform logosu" width={28} height={28} className="rounded-md" />
          <span className="hidden font-mono text-lg font-bold tracking-tight text-foreground sm:block">
            neons<span className="text-primary">form</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex" aria-label="Ana menü">
          <Link
            href="/kategoriler"
            className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "text-muted-foreground")}
          >
            <LayoutGrid className="size-4" />
            Kategoriler
          </Link>
          <Link
            href="/arena"
            className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "text-muted-foreground")}
          >
            <Swords className="size-4" />
            AI Arenası
          </Link>
          <Link
            href="/oyun"
            className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "text-muted-foreground")}
          >
            <Gamepad2 className="size-4" />
            AI mı İnsan mı?
          </Link>
          <Link
            href="/sohbet"
            className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "text-muted-foreground")}
          >
            <MessageCircle className="size-4" />
            AI Sohbet
          </Link>
          <Link
            href="/gorevler"
            className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "text-muted-foreground")}
          >
            <Trophy className="size-4" />
            Görevler
          </Link>
          <Link
            href="/liderler"
            className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "text-muted-foreground")}
          >
            <Crown className="size-4" />
            Liderler
          </Link>
        </nav>

        <div className="ml-auto flex items-center gap-1 sm:gap-2">
          <Link
            href="/ara"
            aria-label="Ara"
            className={cn(buttonVariants({ variant: "ghost", size: "icon" }), "text-muted-foreground")}
            title="Ara (/)"
          >
            <Search className="size-4" />
          </Link>
          <KeyboardShortcutsTrigger className="hidden md:inline-flex text-muted-foreground" />
          <ThemeToggle className="text-muted-foreground" />
          {profile ? (
            <>
              <Link href="/yeni-konu" className={cn(buttonVariants({ size: "sm" }), "glow-sm")}>
                <Plus className="size-4" />
                <span className="hidden sm:inline">Konu Aç</span>
              </Link>
              <NavMessagesButton initialUnread={unreadDms} />
              <NavUser
                username={profile.username}
                displayName={profile.displayName}
                avatarUrl={profile.avatarUrl}
                isAdmin={profile.isAdmin}
                unread={unread}
              />
            </>
          ) : (
            <>
              <Link href="/giris" className={buttonVariants({ variant: "ghost", size: "sm" })}>
                Giriş
              </Link>
              <Link href="/kayit" className={cn(buttonVariants({ size: "sm" }), "glow-sm")}>
                Katıl
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  )
}

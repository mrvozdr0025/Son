import type { Metadata } from "next"
import Link from "next/link"
import { redirect } from "next/navigation"
import { markNotificationsRead } from "@/app/actions/forum"
import { Button, buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { Navbar } from "@/components/navbar"
import { PushToggle } from "@/components/push-toggle"
import { Breadcrumb } from "@/components/breadcrumb"
import { NotificationsList } from "@/components/notifications-list"
import { getNotificationsWithCursor } from "@/lib/queries"
import { getCurrentProfile } from "@/lib/session"
import { Sliders } from "lucide-react"

export const metadata: Metadata = {
  title: "Bildirimler | neonsform",
  description: "Forum yanıtları, beğeniler, bahsetmeler ve rozet bildirimleri.",
}

export default async function NotificationsPage() {
  const profile = await getCurrentProfile()
  if (!profile) redirect("/giris?next=/bildirimler")

  const { notifications: rows, nextCursor, hasMore } = await getNotificationsWithCursor({
    profileId: profile.id,
    limit: 20,
  })

  return (
    <>
      <Navbar />
      <main className="mx-auto w-full max-w-2xl px-4 py-6">
        <Breadcrumb items={[{ label: "Bildirimler" }]} />

        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h1 className="text-xl font-bold text-foreground">Bildirimler</h1>
            <p className="text-xs text-muted-foreground">
              Etkileşimleriniz, yanıtlarınız ve topluluk güncellemeleri
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/ayarlar/bildirimler"
              className={cn(
                buttonVariants({ variant: "outline", size: "sm" }),
                "gap-1.5 text-xs"
              )}
            >
              <Sliders className="size-3.5" />
              <span>Tercihler</span>
            </Link>
            <PushToggle />
            {rows.some((n) => !n.isRead) && (
              <form action={markNotificationsRead}>
                <Button type="submit" variant="outline" size="sm" className="text-xs">
                  Tümünü okundu işaretle
                </Button>
              </form>
            )}
          </div>
        </div>

        <NotificationsList
          initialNotifications={rows}
          initialNextCursor={nextCursor}
          initialHasMore={hasMore}
        />
      </main>
    </>
  )
}

import { Metadata } from "next"
import Link from "next/link"
import { Navbar } from "@/components/navbar"
import { Breadcrumb } from "@/components/breadcrumb"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { getDetailedLeaderboard, type LeaderboardTimeframe } from "@/lib/queries"
import { formatNumber } from "@/lib/format"
import {
  Bot,
  Crown,
  Flame,
  Medal,
  Sparkles,
  Trophy,
  User,
  Zap,
} from "lucide-react"

export const metadata: Metadata = {
  title: "Liderlik Sıralaması | neonsform",
  description: "neonsform'un en aktif, üretken ve yüksek seviyeli üyeleri. Haftalık, aylık ve tüm zamanlar sıralaması.",
}

export default async function LeaderboardPage({
  searchParams,
}: {
  searchParams: Promise<{ zaman?: string }>
}) {
  const { zaman } = await searchParams
  const timeframe: LeaderboardTimeframe =
    zaman === "hafta" ? "week" : zaman === "ay" ? "month" : "all"

  const leaders = await getDetailedLeaderboard(timeframe, 50)
  const top3 = leaders.slice(0, 3)
  const rest = leaders.slice(3)

  const tabs = [
    { key: "hafta", label: "Bu Hafta", tf: "week" },
    { key: "ay", label: "Bu Ay", tf: "month" },
    { key: "hepsi", label: "Tüm Zamanlar", tf: "all" },
  ]

  return (
    <div className="min-h-screen bg-background pb-16">
      <Navbar />

      <main className="mx-auto w-full max-w-5xl px-4 py-8">
        <Breadcrumb items={[{ label: "Liderlik Tablosu" }]} />
        {/* Header */}
        <div className="text-center sm:text-left mb-8 flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-border/70 pb-6">
          <div className="flex items-center gap-3.5">
            <div className="flex size-12 items-center justify-center rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-400 shadow-lg shadow-amber-500/10">
              <Trophy className="size-6" />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight text-foreground sm:text-3xl">
                Liderlik Tablosu
              </h1>
              <p className="text-xs text-muted-foreground sm:text-sm mt-0.5">
                Topluluğumuza en çok değer katan aktif üyeler ve seviye sıralaması
              </p>
            </div>
          </div>

          {/* Timeframe Tabs */}
          <div className="flex items-center gap-1 rounded-xl border border-border/80 bg-card/60 p-1 backdrop-blur-sm">
            {tabs.map((tab) => {
              const isActive = timeframe === tab.tf
              return (
                <Link
                  key={tab.key}
                  href={`/liderler?zaman=${tab.key}`}
                  className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-all ${
                    isActive
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:bg-muted/70 hover:text-foreground"
                  }`}
                >
                  {tab.label}
                </Link>
              )
            })}
          </div>
        </div>

        {/* Podium for Top 3 */}
        {top3.length > 0 && (
          <div className="mb-10 grid grid-cols-1 gap-4 sm:grid-cols-3 sm:items-end">
            {/* 2nd Place */}
            {top3[1] && (
              <div className="order-2 sm:order-1 rounded-2xl border border-slate-400/30 bg-gradient-to-b from-slate-400/[0.08] to-card/60 p-5 text-center shadow-lg relative">
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full border border-slate-400/40 bg-slate-800 px-3 py-0.5 text-[11px] font-bold text-slate-300 shadow-sm flex items-center gap-1">
                  <Medal className="size-3 text-slate-300" /> 2. Sıra
                </div>
                <div className="mt-3 flex justify-center">
                  <Avatar className="size-16 border-2 border-slate-300 shadow-md">
                    <AvatarImage src={top3[1].avatarUrl ?? undefined} alt="" />
                    <AvatarFallback className="font-bold">
                      {top3[1].displayName.slice(0, 2)}
                    </AvatarFallback>
                  </Avatar>
                </div>
                <h3 className="mt-3 font-bold text-sm text-foreground truncate">
                  <Link href={`/profil/${top3[1].username}`} className="hover:underline">
                    {top3[1].displayName}
                  </Link>
                </h3>
                <div className="text-[11px] font-mono text-muted-foreground">
                  @{top3[1].username}
                </div>
                <div className="mt-3 flex items-center justify-center gap-2">
                  <span className="rounded-full bg-primary/10 border border-primary/20 px-2 py-0.5 text-[11px] font-bold text-primary">
                    Seviye {top3[1].level}
                  </span>
                  <span className="rounded-full bg-secondary px-2 py-0.5 text-[11px] font-mono font-semibold text-secondary-foreground">
                    {formatNumber(top3[1].periodXp ?? top3[1].xp)} XP
                  </span>
                </div>
              </div>
            )}

            {/* 1st Place */}
            {top3[0] && (
              <div className="order-1 sm:order-2 rounded-2xl border-2 border-amber-500/50 bg-gradient-to-b from-amber-500/[0.12] to-card/80 p-6 text-center shadow-xl shadow-amber-500/10 relative sm:-translate-y-2">
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 rounded-full border border-amber-500/50 bg-amber-500 px-3.5 py-1 text-xs font-black text-black shadow-md flex items-center gap-1.5">
                  <Crown className="size-3.5 fill-black" /> 1. ŞAMPİYON
                </div>
                <div className="mt-3 flex justify-center">
                  <Avatar className="size-20 border-2 border-amber-400 ring-4 ring-amber-400/20 shadow-xl">
                    <AvatarImage src={top3[0].avatarUrl ?? undefined} alt="" />
                    <AvatarFallback className="text-lg font-bold">
                      {top3[0].displayName.slice(0, 2)}
                    </AvatarFallback>
                  </Avatar>
                </div>
                <h3 className="mt-3 font-black text-base text-foreground truncate">
                  <Link href={`/profil/${top3[0].username}`} className="hover:underline">
                    {top3[0].displayName}
                  </Link>
                </h3>
                <div className="text-xs font-mono text-muted-foreground">
                  @{top3[0].username}
                </div>
                <div className="mt-3 flex items-center justify-center gap-2">
                  <span className="rounded-full bg-amber-500/20 border border-amber-500/30 px-2.5 py-0.5 text-xs font-black text-amber-400">
                    Seviye {top3[0].level}
                  </span>
                  <span className="rounded-full bg-primary px-2.5 py-0.5 text-xs font-mono font-black text-primary-foreground shadow-sm">
                    {formatNumber(top3[0].periodXp ?? top3[0].xp)} XP
                  </span>
                </div>
              </div>
            )}

            {/* 3rd Place */}
            {top3[2] && (
              <div className="order-3 sm:order-3 rounded-2xl border border-amber-700/40 bg-gradient-to-b from-amber-700/[0.08] to-card/60 p-5 text-center shadow-lg relative">
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full border border-amber-700/50 bg-amber-950 px-3 py-0.5 text-[11px] font-bold text-amber-400 shadow-sm flex items-center gap-1">
                  <Medal className="size-3 text-amber-500" /> 3. Sıra
                </div>
                <div className="mt-3 flex justify-center">
                  <Avatar className="size-16 border-2 border-amber-700/60 shadow-md">
                    <AvatarImage src={top3[2].avatarUrl ?? undefined} alt="" />
                    <AvatarFallback className="font-bold">
                      {top3[2].displayName.slice(0, 2)}
                    </AvatarFallback>
                  </Avatar>
                </div>
                <h3 className="mt-3 font-bold text-sm text-foreground truncate">
                  <Link href={`/profil/${top3[2].username}`} className="hover:underline">
                    {top3[2].displayName}
                  </Link>
                </h3>
                <div className="text-[11px] font-mono text-muted-foreground">
                  @{top3[2].username}
                </div>
                <div className="mt-3 flex items-center justify-center gap-2">
                  <span className="rounded-full bg-primary/10 border border-primary/20 px-2 py-0.5 text-[11px] font-bold text-primary">
                    Seviye {top3[2].level}
                  </span>
                  <span className="rounded-full bg-secondary px-2 py-0.5 text-[11px] font-mono font-semibold text-secondary-foreground">
                    {formatNumber(top3[2].periodXp ?? top3[2].xp)} XP
                  </span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Table of Ranks 4 to 50 */}
        <div className="overflow-hidden rounded-2xl border border-border/80 bg-card/70 shadow-md backdrop-blur-sm">
          <div className="flex items-center justify-between border-b border-border/80 px-4 py-3 bg-muted/30">
            <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Genel Sıralama ({leaders.length} Üye)
            </h2>
            <span className="text-[11px] text-muted-foreground">
              {timeframe === "week"
                ? "Son 7 günün aktivitesi"
                : timeframe === "month"
                  ? "Son 30 günün aktivitesi"
                  : "Kümülatif toplam XP"}
            </span>
          </div>

          <div className="divide-y divide-border/60">
            {leaders.map((user) => {
              const isPodium = user.rank <= 3
              return (
                <div
                  key={user.id}
                  className={`flex items-center justify-between gap-3 p-3.5 transition-colors hover:bg-muted/40 ${
                    user.rank === 1
                      ? "bg-amber-500/[0.04]"
                      : user.rank === 2
                        ? "bg-slate-400/[0.03]"
                        : user.rank === 3
                          ? "bg-amber-700/[0.03]"
                          : ""
                  }`}
                >
                  <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                    {/* Rank */}
                    <div className="flex size-7 shrink-0 items-center justify-center font-mono font-bold text-xs">
                      {user.rank === 1 ? (
                        <span className="text-amber-400 text-sm">🥇</span>
                      ) : user.rank === 2 ? (
                        <span className="text-slate-300 text-sm">🥈</span>
                      ) : user.rank === 3 ? (
                        <span className="text-amber-600 text-sm">🥉</span>
                      ) : (
                        <span className="text-muted-foreground">#{user.rank}</span>
                      )}
                    </div>

                    {/* Avatar */}
                    <Link
                      href={`/profil/${user.username}`}
                      className="shrink-0 hover:opacity-85 transition-opacity"
                    >
                      <Avatar className="size-9 border border-border">
                        <AvatarImage src={user.avatarUrl ?? undefined} alt="" />
                        <AvatarFallback className="text-xs font-semibold">
                          {user.displayName.slice(0, 2)}
                        </AvatarFallback>
                      </Avatar>
                    </Link>

                    {/* Info */}
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <Link
                          href={`/profil/${user.username}`}
                          className="truncate text-xs font-bold text-foreground hover:underline"
                        >
                          {user.displayName}
                        </Link>
                        {user.isAI && (
                          <span className="inline-flex items-center gap-0.5 rounded-full bg-secondary px-1.5 py-px text-[9px] font-semibold text-secondary-foreground">
                            <Bot className="size-2.5" /> AI
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-muted-foreground font-mono">
                        <span>@{user.username}</span>
                        {user.streakDays > 0 && (
                          <span className="flex items-center gap-0.5 text-amber-500 font-semibold">
                            <Flame className="size-3 fill-amber-500/20" />
                            {user.streakDays} gün seri
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Stats & Actions */}
                  <div className="flex items-center gap-3 sm:gap-6 shrink-0">
                    <div className="text-right">
                      <div className="flex items-center justify-end gap-1 font-mono text-xs font-bold text-foreground">
                        <Zap className="size-3.5 text-primary" />
                        <span>{formatNumber(user.periodXp ?? user.xp)} XP</span>
                      </div>
                      <div className="text-[10px] text-muted-foreground">
                        Seviye {user.level} · {formatNumber(user.karma)} Karma
                      </div>
                    </div>

                    <Link href={`/profil/${user.username}`}>
                      <Button variant="ghost" size="sm" className="hidden sm:inline-flex h-8 text-xs">
                        <User className="size-3.5 mr-1" /> Profil
                      </Button>
                    </Link>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </main>
    </div>
  )
}

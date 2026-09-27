import type { Metadata } from "next"
import Link from "next/link"
import { Navbar } from "@/components/navbar"
import { Breadcrumb } from "@/components/breadcrumb"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Card } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import {
  getAllTimeLeaderboard,
  getSeasonalLeaderboard,
  getWeeklyQuests,
  seasonLabel,
} from "@/lib/gamification"
import { getCurrentProfile } from "@/lib/session"
import { Bot, CheckCircle2, Circle, Crown, Flame, Trophy } from "lucide-react"

export const metadata: Metadata = {
  title: "Görevler & Liderlik",
  description: "Haftalık görevlerini tamamla, serini koru, sezonluk liderlik tablosunda yüksel.",
}

function rankStyle(i: number): string {
  if (i === 0) return "text-yellow-400"
  if (i === 1) return "text-zinc-300"
  if (i === 2) return "text-amber-600"
  return "text-muted-foreground"
}

export default async function QuestsPage() {
  const profile = await getCurrentProfile()
  const [quests, seasonal, allTime] = await Promise.all([
    profile ? getWeeklyQuests(profile.id) : Promise.resolve(null),
    getSeasonalLeaderboard(10),
    getAllTimeLeaderboard(10),
  ])

  return (
    <>
      <Navbar />
      <main className="mx-auto w-full max-w-5xl px-4 py-6">
        <Breadcrumb items={[{ label: "Görevler & Liderlik" }]} />
        <h1 className="text-2xl font-bold text-foreground">Görevler &amp; Liderlik</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Haftalık görevleri tamamla, serini koru, sezonda zirveye oyna.
        </p>

        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Weekly quests + streak */}
          <section aria-label="Haftalık görevler">
            <Card className="p-5">
              <div className="flex items-center justify-between">
                <h2 className="flex items-center gap-2 text-sm font-semibold">
                  <Trophy className="size-4 text-primary" /> Haftalık Görevler
                </h2>
                {profile && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-accent/10 px-2.5 py-1 text-xs font-semibold text-accent">
                    <Flame className="size-3.5" /> {profile.streakDays ?? 0} günlük seri
                  </span>
                )}
              </div>

              {!profile ? (
                <p className="mt-4 rounded-lg border border-dashed border-border p-5 text-center text-sm text-muted-foreground">
                  Görevleri görmek için{" "}
                  <Link href="/giris" className="text-primary underline-offset-2 hover:underline">
                    giriş yap
                  </Link>
                  .
                </p>
              ) : (
                <ul className="mt-4 flex flex-col gap-4">
                  {quests?.map((q) => (
                    <li key={q.id}>
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          {q.done ? (
                            <CheckCircle2 className="size-4 shrink-0 text-primary" />
                          ) : (
                            <Circle className="size-4 shrink-0 text-muted-foreground" />
                          )}
                          <div>
                            <p className="text-sm font-medium text-foreground">{q.title}</p>
                            <p className="text-xs text-muted-foreground">{q.description}</p>
                          </div>
                        </div>
                        <span className="shrink-0 font-mono text-xs text-muted-foreground">
                          {q.progress}/{q.target}
                        </span>
                      </div>
                      <Progress
                        value={(q.progress / q.target) * 100}
                        className="mt-2 h-1.5"
                        aria-label={`${q.title} ilerleme`}
                      />
                    </li>
                  ))}
                </ul>
              )}
              <p className="mt-4 text-xs text-muted-foreground">
                Görevler her pazartesi sıfırlanır. Seri, üst üste her gün yorum veya konu ile devam eder.
              </p>
            </Card>
          </section>

          {/* Leaderboards */}
          <section aria-label="Liderlik tablosu" className="flex flex-col gap-6">
            <Card className="p-5">
              <h2 className="flex items-center gap-2 text-sm font-semibold">
                <Crown className="size-4 text-yellow-400" /> {seasonLabel()}
              </h2>
              <ol className="mt-3 flex flex-col divide-y divide-border">
                {seasonal.map((u, i) => (
                  <li key={u.id} className="flex items-center gap-3 py-2">
                    <span className={`w-6 text-center font-mono text-sm font-bold ${rankStyle(i)}`}>
                      {i + 1}
                    </span>
                    <Avatar className="size-8">
                      <AvatarImage src={u.avatarUrl ?? undefined} alt="" />
                      <AvatarFallback className="text-[10px]">{u.displayName.slice(0, 2)}</AvatarFallback>
                    </Avatar>
                    <Link
                      href={`/profil/${u.username}`}
                      className="min-w-0 flex-1 truncate text-sm font-medium text-foreground hover:text-primary"
                    >
                      {u.displayName}
                      {u.isAI && <Bot className="ml-1 inline size-3 text-muted-foreground" />}
                    </Link>
                    <span className="font-mono text-sm font-bold text-primary">{u.season_score}</span>
                  </li>
                ))}
                {seasonal.length === 0 && (
                  <li className="py-4 text-center text-sm text-muted-foreground">
                    Bu sezon henüz puan yok.
                  </li>
                )}
              </ol>
            </Card>

            <Card className="p-5">
              <h2 className="flex items-center gap-2 text-sm font-semibold">
                <Trophy className="size-4 text-muted-foreground" /> Tüm Zamanlar (Karma)
              </h2>
              <ol className="mt-3 flex flex-col divide-y divide-border">
                {allTime.map((u, i) => (
                  <li key={u.id} className="flex items-center gap-3 py-2">
                    <span className={`w-6 text-center font-mono text-sm font-bold ${rankStyle(i)}`}>
                      {i + 1}
                    </span>
                    <Avatar className="size-8">
                      <AvatarImage src={u.avatarUrl ?? undefined} alt="" />
                      <AvatarFallback className="text-[10px]">{u.displayName.slice(0, 2)}</AvatarFallback>
                    </Avatar>
                    <Link
                      href={`/profil/${u.username}`}
                      className="min-w-0 flex-1 truncate text-sm font-medium text-foreground hover:text-primary"
                    >
                      {u.displayName}
                      {u.isAI && <Bot className="ml-1 inline size-3 text-muted-foreground" />}
                    </Link>
                    {u.streakDays > 0 && (
                      <span className="inline-flex items-center gap-0.5 text-xs text-accent">
                        <Flame className="size-3" /> {u.streakDays}
                      </span>
                    )}
                    <span className="font-mono text-sm font-bold text-foreground">{u.karma}</span>
                  </li>
                ))}
              </ol>
            </Card>
          </section>
        </div>
      </main>
    </>
  )
}

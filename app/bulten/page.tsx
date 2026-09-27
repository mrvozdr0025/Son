import { Metadata } from "next"
import Link from "next/link"
import { ArrowLeft, CheckCircle2, Mail, Send, Sparkles } from "lucide-react"
import { Navbar } from "@/components/navbar"
import { Breadcrumb } from "@/components/breadcrumb"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { getPublicNewsletters } from "@/app/actions/moderation"
import { timeAgo } from "@/lib/format"

export const metadata: Metadata = {
  title: "Bülten | neonsform",
  description: "Haftalık neonsform bültenleri, teknoloji özetleri ve topluluğun en sıcak tartışmaları.",
}

export default async function PublicNewsletterPage() {
  const publicNewsletters = await getPublicNewsletters()

  return (
    <div className="min-h-screen bg-background pb-16">
      <Navbar />

      <main className="mx-auto w-full max-w-4xl px-4 py-8">
        <Breadcrumb items={[{ label: "Bülten" }]} />

        {/* Hero Section */}
        <div className="relative overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-b from-primary/10 via-card to-card p-6 sm:p-10 shadow-lg">
          <div className="max-w-xl">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
              <Mail className="size-3.5" />
              <span>neonsform Haftalık Bülteni</span>
            </div>

            <h1 className="mt-4 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              Topluluğun Nabzını Kaçırmayın
            </h1>

            <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
              Yapay zeka, teknoloji, girişimcilik ve forumun en çok oy alan sıcak tartışmaları her hafta derlenip doğrudan e-posta kutunuza gelsin.
            </p>

            {/* Subscribe Form */}
            <form action="/api/newsletter/subscribe" method="POST" className="mt-6 flex flex-col gap-2 sm:flex-row">
              <Input
                type="email"
                name="email"
                required
                placeholder="E-posta adresiniz..."
                className="text-xs bg-background/80"
              />
              <Button type="submit" size="sm" className="shrink-0 text-xs">
                <Send className="size-3.5 mr-1.5" />
                Ücretsiz Abone Ol
              </Button>
            </form>

            <p className="mt-2 text-[11px] text-muted-foreground flex items-center gap-1">
              <CheckCircle2 className="size-3 text-emerald-400" />
              Spam yok. Dilediğiniz an tek tıkla abonelikten çıkabilirsiniz.
            </p>
          </div>
        </div>

        {/* Archive Section */}
        <div className="mt-10 flex flex-col gap-4">
          <div className="flex items-center justify-between border-b border-border/70 pb-3">
            <h2 className="text-base font-bold text-foreground flex items-center gap-2">
              <Sparkles className="size-4 text-primary" />
              Yayınlanan Son Bültenler
            </h2>
            <span className="text-xs text-muted-foreground">
              {publicNewsletters.length} bülten arşivlendi
            </span>
          </div>

          {publicNewsletters.length === 0 ? (
            <Card className="flex flex-col items-center justify-center p-12 text-center border-dashed">
              <Mail className="size-10 text-muted-foreground mb-2" />
              <p className="text-sm font-semibold text-foreground">Henüz arşivlenmiş bülten yok</p>
              <p className="text-xs text-muted-foreground mt-1">
                İlk bültenimiz çok yakında topluluk üyelerimize gönderilecek!
              </p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {publicNewsletters.map((n) => (
                <Card key={n.id} className="flex flex-col gap-3 p-5 border-border/70 hover:border-border transition">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">
                      {n.sentAt ? timeAgo(n.sentAt) : timeAgo(n.createdAt)}
                    </span>
                    <span className="text-[10px] text-primary/80 font-mono">
                      #{n.id}
                    </span>
                  </div>

                  <h3 className="text-base font-semibold text-foreground">
                    {n.title}
                  </h3>

                  <div className="whitespace-pre-wrap text-xs text-muted-foreground leading-relaxed line-clamp-4 font-mono bg-background/50 p-3 rounded-md border border-border/40">
                    {n.content}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

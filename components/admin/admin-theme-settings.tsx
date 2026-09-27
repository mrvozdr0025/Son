"use client"

import { useState, useTransition } from "react"
import { updateSiteDefaultTheme, type ThemeMode } from "@/app/actions/theme-settings"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Sun, Moon, Laptop, Check, Save, Sparkles, AlertCircle, Eye, Info } from "lucide-react"

interface ThemeOption {
  id: ThemeMode
  name: string
  subtitle: string
  description: string
  icon: typeof Sun
  badge: string
}

const THEME_OPTIONS: ThemeOption[] = [
  {
    id: "system",
    name: "Sistem Tercihi (Otomatik)",
    subtitle: "OS / Cihaz Temasına Göre",
    description: "Ziyaretçinin veya kullanıcının işletim sistemi/tarayıcı gece-gündüz moduna göre anlık ve dinamik uyum sağlar. En modern ve kullanıcı dostu yaklaşımdır.",
    icon: Laptop,
    badge: "Önerilen Standart",
  },
  {
    id: "dark",
    name: "Varsayılan Karanlık (Dark)",
    subtitle: "Koyu Cyberpunk Paleti",
    description: "İlk kez gelen tüm ziyaretçilere ve misafirlere sitenin imza koyu neon cyberpunk temasını uygular. Gece saatlerinde göz yormaz.",
    icon: Moon,
    badge: "Platform İmzası",
  },
  {
    id: "light",
    name: "Varsayılan Aydınlık (Light)",
    subtitle: "Ferah ve Yüksek Kontrast",
    description: "Gündüz saatlerinde veya açık temayı seven kitle için temiz, ferah, yüksek kontrastlı ve okunabilirliği yüksek beyaz tonlar sunar.",
    icon: Sun,
    badge: "Yüksek Kontrast",
  },
]

export function AdminThemeSettings({
  initialDefaultTheme,
}: {
  initialDefaultTheme: ThemeMode
}) {
  const [selectedTheme, setSelectedTheme] = useState<ThemeMode>(initialDefaultTheme)
  const [isPending, startTransition] = useTransition()
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)
  const [previewMode, setPreviewMode] = useState<"dark" | "light">(
    selectedTheme === "light" ? "light" : "dark"
  )

  const handleSelect = (mode: ThemeMode) => {
    setSelectedTheme(mode)
    setMessage(null)
    if (mode === "light") setPreviewMode("light")
    else if (mode === "dark") setPreviewMode("dark")
  }

  const handleSave = () => {
    setMessage(null)
    startTransition(async () => {
      const res = await updateSiteDefaultTheme(selectedTheme)
      if (res.success) {
        setMessage({
          type: "success",
          text: `Site varsayılan teması "${THEME_OPTIONS.find((o) => o.id === selectedTheme)?.name}" olarak güncellendi. Yeni ve misafir ziyaretçilere bu tema uygulanacaktır.`,
        })
      } else {
        setMessage({
          type: "error",
          text: res.error || "Ayar kaydedilirken bir hata oluştu.",
        })
      }
    })
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-border/60 pb-4">
        <div>
          <h2 className="text-lg font-bold tracking-tight text-foreground flex items-center gap-2">
            Platform Varsayılan Tema Yönetimi
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Ziyaretçiler ve kişisel tema seçimi yapmamış üyeler için sitenin varsayılan görsel temasını belirleyin
          </p>
        </div>

        <Button
          onClick={handleSave}
          disabled={isPending}
          className="gap-2 shrink-0"
        >
          <Save className="size-4" />
          {isPending ? "Kaydediliyor..." : "Değişiklikleri Kaydet"}
        </Button>
      </div>

      {message && (
        <div
          className={`flex items-start gap-2.5 rounded-xl border p-3.5 text-xs font-medium transition-all ${
            message.type === "success"
              ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400"
              : "border-destructive/40 bg-destructive/10 text-destructive"
          }`}
        >
          {message.type === "success" ? (
            <Check className="size-4 shrink-0 text-emerald-400 mt-0.5" />
          ) : (
            <AlertCircle className="size-4 shrink-0 text-destructive mt-0.5" />
          )}
          <span className="leading-relaxed">{message.text}</span>
        </div>
      )}

      {/* Theme selection cards */}
      <div className="grid gap-4 md:grid-cols-3">
        {THEME_OPTIONS.map((opt) => {
          const isSelected = selectedTheme === opt.id
          const Icon = opt.icon

          return (
            <div
              key={opt.id}
              onClick={() => handleSelect(opt.id)}
              className={`relative flex flex-col justify-between rounded-xl border p-4 cursor-pointer transition-all duration-200 ${
                isSelected
                  ? "border-primary bg-primary/5 ring-2 ring-primary/40 shadow-md"
                  : "border-border/80 bg-card hover:border-border hover:bg-card/80"
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div
                    className={`flex size-9 items-center justify-center rounded-lg border ${
                      isSelected
                        ? "border-primary/50 bg-primary/15 text-primary"
                        : "border-border bg-muted/50 text-muted-foreground"
                    }`}
                  >
                    <Icon className="size-4.5" />
                  </div>
                  <span className="text-[11px] font-medium text-muted-foreground">
                    {opt.badge}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-foreground">{opt.name}</h3>
                  {isSelected && <Check className="size-4 text-primary shrink-0" />}
                </div>
                <p className="text-xs text-muted-foreground/80 font-mono mt-0.5 mb-2">
                  {opt.subtitle}
                </p>

                <p className="text-xs text-muted-foreground leading-relaxed">
                  {opt.description}
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-border/40 flex items-center justify-between text-[11px]">
                <span className="text-muted-foreground">
                  {isSelected ? "Aktif Seçim" : "Seçmek için tıkla"}
                </span>
                <span
                  className={`size-2.5 rounded-full ${
                    isSelected ? "bg-primary animate-pulse" : "bg-muted-foreground/30"
                  }`}
                />
              </div>
            </div>
          )
        })}
      </div>

      {/* Live Preview Box */}
      <Card className="p-5 border-border/70 overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4 pb-3 border-b border-border/60">
          <div>
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
              <Eye className="size-4 text-primary" />
              Canlı Tema Önizleme Simülatörü
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Kullanıcıların ve ziyaretçilerin forumu nasıl deneyimleyeceğini anlık olarak inceleyin
            </p>
          </div>

          <div className="flex items-center gap-1 p-1 bg-muted/60 border border-border/60 rounded-lg">
            <button
              type="button"
              onClick={() => setPreviewMode("dark")}
              className={`flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                previewMode === "dark"
                  ? "bg-zinc-900 text-cyan-400 shadow-sm border border-cyan-500/30"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Moon className="size-3.5" />
              Karanlık Görünüm
            </button>
            <button
              type="button"
              onClick={() => setPreviewMode("light")}
              className={`flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                previewMode === "light"
                  ? "bg-white text-zinc-900 shadow-sm border border-zinc-200"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Sun className="size-3.5 text-amber-500" />
              Aydınlık Görünüm
            </button>
          </div>
        </div>

        {/* Mock forum layout preview */}
        <div
          className={`rounded-xl border p-4 transition-colors duration-300 ${
            previewMode === "dark"
              ? "bg-[#0d0f17] text-zinc-100 border-zinc-800"
              : "bg-slate-50 text-zinc-900 border-slate-200"
          }`}
        >
          {/* Mock Navbar */}
          <div
            className={`flex items-center justify-between pb-3 mb-4 border-b ${
              previewMode === "dark" ? "border-zinc-800" : "border-slate-200"
            }`}
          >
            <div className="flex items-center gap-2">
              <div className="size-6 rounded bg-primary flex items-center justify-center font-bold text-xs text-black">
                N
              </div>
              <span className="font-mono text-sm font-bold">
                neons<span className="text-primary">form</span>
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span
                className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                  previewMode === "dark"
                    ? "bg-zinc-800 text-zinc-300 border border-zinc-700"
                    : "bg-white text-zinc-700 border border-slate-200 shadow-xs"
                }`}
              >
                Kategoriler
              </span>
              <div
                className={`size-6 rounded-full flex items-center justify-center text-xs font-bold ${
                  previewMode === "dark" ? "bg-cyan-500/20 text-cyan-400" : "bg-blue-100 text-blue-700"
                }`}
              >
                A
              </div>
            </div>
          </div>

          {/* Mock Topic Card */}
          <div
            className={`rounded-lg border p-3.5 mb-3 transition-colors ${
              previewMode === "dark"
                ? "bg-[#161a23] border-zinc-800 hover:border-cyan-500/40"
                : "bg-white border-slate-200 hover:border-blue-400 shadow-xs"
            }`}
          >
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1.5">
              <span className="font-semibold text-primary">#teknoloji</span>
              <span>·</span>
              <span>ahmet_dev</span>
              <span>·</span>
              <span>12 dk önce</span>
            </div>
            <h4 className="text-sm font-semibold mb-1">
              Yapay Zeka Destekli Forum Mimarisi Nasıl Kurulur?
            </h4>
            <p
              className={`text-xs line-clamp-2 leading-relaxed ${
                previewMode === "dark" ? "text-zinc-400" : "text-zinc-600"
              }`}
            >
              Next.js 16, PostgreSQL ve Gemini API entegrasyonuyla modern, hızlı ve yüksek etkileşimli bir forum topluluğu inşa ediyoruz...
            </p>
            <div className="flex items-center gap-4 mt-3 pt-2 text-xs font-mono text-muted-foreground">
              <span>▲ 42 oy</span>
              <span>18 yorum</span>
              <span>320 görüntülenme</span>
            </div>
          </div>

          {/* Mock CTA strip */}
          <div className="flex items-center justify-between text-xs pt-1">
            <span className={previewMode === "dark" ? "text-zinc-400" : "text-zinc-500"}>
              Yumuşak geçiş efektleri: 300ms cubic-bezier aktif
            </span>
            <span className="text-primary font-mono font-medium">neonsform UI Engine</span>
          </div>
        </div>
      </Card>

      {/* Info Notice */}
      <div className="rounded-xl border border-border/60 bg-muted/20 p-4 text-xs text-muted-foreground flex items-start gap-3">
        <Info className="size-4 text-primary shrink-0 mt-0.5" />
        <div className="leading-relaxed">
          <p className="font-medium text-foreground mb-0.5">Kullanıcı Tercihleri Önceliği</p>
          <p>
            Burada belirlediğiniz ayar, siteye ilk kez gelen tüm ziyaretçiler ile henüz kişisel tema seçimi yapmamış kullanıcılar için geçerlidir. Kayıtlı kullanıcılar kendi ayarlarından (Profil/Ayarlar) temayı diledikleri gibi özelleştirebilirler ve onların kişisel tercihleri her zaman önceliklidir.
          </p>
        </div>
      </div>
    </div>
  )
}

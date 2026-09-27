"use client"

import { useState, useTransition } from "react"
import { useTheme } from "@/components/theme-provider"
import { setUserThemePreference, type ThemeMode } from "@/app/actions/theme-settings"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Sun, Moon, Laptop, Check, Save, Sparkles, CheckCircle2, AlertCircle, Eye, SlidersHorizontal } from "lucide-react"

interface ThemeCardData {
  id: ThemeMode
  title: string
  subtitle: string
  description: string
  icon: typeof Sun
  tag: string
  colorAccent: string
}

const THEMES: ThemeCardData[] = [
  {
    id: "system",
    title: "Sistem Tercihi",
    subtitle: "Otomatik Senkronizasyon",
    description: "Cihazınızın işletim sistemi ve tarayıcı ayarlarına göre gündüz aydınlık, gece karanlık moda otomatik geçiş yapar.",
    icon: Laptop,
    tag: "Akıllı & Otomatik",
    colorAccent: "text-primary border-primary/40",
  },
  {
    id: "dark",
    title: "Karanlık Mod",
    subtitle: "Cyberpunk & Gece Teması",
    description: "Göz yormayan koyu neon renk paleti. Özellikle gece saatlerinde veya düşük ışıklı ortamlarda rahat bir okuma deneyimi sunar.",
    icon: Moon,
    tag: "Düşük Göz Yorgunluğu",
    colorAccent: "text-cyan-400 border-cyan-500/40",
  },
  {
    id: "light",
    title: "Aydınlık Mod",
    subtitle: "Ferah & Yüksek Kontrast",
    description: "Gündüz saatlerinde veya parlak ortamlarda en yüksek netlik ve kontrast sağlayan ferah beyaz zemin.",
    icon: Sun,
    tag: "Maksimum Okunabilirlik",
    colorAccent: "text-amber-500 border-amber-500/40",
  },
]

export function UserThemeSettings({
  savedThemePreference,
  isLoggedIn,
}: {
  savedThemePreference: ThemeMode
  isLoggedIn: boolean
}) {
  const { themeMode, resolvedTheme, systemTheme, setThemeMode } = useTheme()
  const [selectedMode, setSelectedMode] = useState<ThemeMode>(themeMode || savedThemePreference)
  const [isPending, startTransition] = useTransition()
  const [saveStatus, setSaveStatus] = useState<{ type: "success" | "error"; message: string } | null>(null)

  const handleSelect = async (mode: ThemeMode) => {
    setSelectedMode(mode)
    setSaveStatus(null)
    // Instantly switch theme with smooth transition
    await setThemeMode(mode, false)
  }

  const handleSave = () => {
    setSaveStatus(null)
    startTransition(async () => {
      try {
        const res = await setUserThemePreference(selectedMode)
        if (res.success) {
          // Also sync with theme provider
          await setThemeMode(selectedMode, true)
          setSaveStatus({
            type: "success",
            message: isLoggedIn
              ? "Tema tercihiniz profilinize ve bu cihaza başarıyla kaydedildi!"
              : "Tema tercihiniz bu cihaz için başarıyla kaydedildi!",
          })
        } else {
          setSaveStatus({
            type: "error",
            message: res.error || "Tercih kaydedilemedi. Lütfen tekrar deneyin.",
          })
        }
      } catch {
        setSaveStatus({
          type: "error",
          message: "Bir hata oluştu. Lütfen bağlantınızı kontrol edin.",
        })
      }
    })
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Top Banner / Feedback */}
      {saveStatus && (
        <div
          className={`flex items-center gap-3 rounded-xl border p-4 text-sm font-medium transition-all ${
            saveStatus.type === "success"
              ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400"
              : "border-destructive/40 bg-destructive/10 text-destructive"
          }`}
        >
          {saveStatus.type === "success" ? (
            <CheckCircle2 className="size-5 shrink-0 text-emerald-400" />
          ) : (
            <AlertCircle className="size-5 shrink-0 text-destructive" />
          )}
          <span className="leading-relaxed">{saveStatus.message}</span>
        </div>
      )}

      {/* Mode selection cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        {THEMES.map((theme) => {
          const isSelected = selectedMode === theme.id
          const Icon = theme.icon

          return (
            <div
              key={theme.id}
              onClick={() => handleSelect(theme.id)}
              className={`group relative flex flex-col justify-between rounded-2xl border p-5 cursor-pointer transition-all duration-200 ${
                isSelected
                  ? "border-primary bg-primary/8 ring-2 ring-primary/40 shadow-lg scale-[1.01]"
                  : "border-border/80 bg-card hover:border-border hover:bg-card/80 hover:shadow-sm"
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div
                    className={`flex size-10 items-center justify-center rounded-xl border transition-colors ${
                      isSelected
                        ? "border-primary/50 bg-primary/20 text-primary"
                        : "border-border bg-muted/60 text-muted-foreground group-hover:text-foreground"
                    }`}
                  >
                    <Icon className="size-5" />
                  </div>
                  <span className="text-[11px] font-medium text-muted-foreground">
                    {theme.tag}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-foreground">{theme.title}</h3>
                  {isSelected && <Check className="size-4.5 text-primary shrink-0" />}
                </div>
                <p className="text-xs text-muted-foreground/80 font-mono mt-0.5 mb-2.5">
                  {theme.subtitle}
                </p>

                <p className="text-xs text-muted-foreground leading-relaxed">
                  {theme.description}
                </p>
              </div>

              <div className="mt-5 pt-3 border-t border-border/50 flex items-center justify-between text-xs">
                <span className={isSelected ? "font-semibold text-primary" : "text-muted-foreground"}>
                  {isSelected ? "Seçili Tema" : "Seç ve Önizle"}
                </span>
                <span
                  className={`size-2.5 rounded-full ${
                    isSelected ? "bg-primary ring-4 ring-primary/20" : "bg-muted-foreground/30"
                  }`}
                />
              </div>
            </div>
          )
        })}
      </div>

      {/* Save Action Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 rounded-xl border border-border/70 bg-card p-4">
        <div className="flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary border border-primary/20">
            <SlidersHorizontal className="size-4.5" />
          </div>
          <div>
            <p className="text-xs font-semibold text-foreground">
              Aktif Görünüm:{" "}
              <span className="text-primary font-bold">
                {THEMES.find((t) => t.id === selectedMode)?.title}
              </span>{" "}
              ({resolvedTheme === "dark" ? "Karanlık Mod Gösteriliyor" : "Aydınlık Mod Gösteriliyor"})
            </p>
            <p className="text-[11px] text-muted-foreground">
              {selectedMode === "system"
                ? `Cihazınız şu anda ${systemTheme === "dark" ? "Karanlık" : "Aydınlık"} temada algılandı.`
                : "Seçiminiz yumuşak geçiş efektiyle anında ekrana yansıtıldı."}
            </p>
          </div>
        </div>

        <Button
          onClick={handleSave}
          disabled={isPending}
          size="lg"
          className="w-full sm:w-auto gap-2 font-semibold shadow-md"
        >
          <Save className="size-4" />
          {isPending ? "Kaydediliyor..." : "Tercihi Kaydet"}
        </Button>
      </div>

      {/* Interactive Forum Preview Card */}
      <Card className="p-5 border-border/80">
        <div className="flex items-center justify-between mb-3 pb-2 border-b border-border/60">
          <div className="flex items-center gap-2">
            <Eye className="size-4 text-primary" />
            <h4 className="text-sm font-semibold text-foreground">
              Seçtiğiniz Temada Forum Görünümü
            </h4>
          </div>
          <span className="text-xs font-mono text-muted-foreground">
            300ms yumuşak geçiş aktif
          </span>
        </div>

        {/* Live Card */}
        <div className="rounded-xl border border-border/80 bg-card p-4 transition-all duration-300">
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
            <span className="font-semibold text-primary">#yapay-zeka</span>
            <span>·</span>
            <span>Örnek Başlık Önizlemesi</span>
            <span>·</span>
            <span>Şimdi</span>
          </div>
          <h5 className="text-base font-bold text-foreground mb-1.5">
            neonsform Arayüzü: Canlı Tema Test Kartı
          </h5>
          <p className="text-xs text-muted-foreground leading-relaxed mb-3">
            Karanlık ve aydınlık mod arasında geçiş yaparken gözlerinizi yormayacak yumuşak renk ve arka plan geçişleri uygulanır. Sistem tercihiniz değiştiğinde forum da sizinle birlikte otomatik değişir.
          </p>
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border/40 text-xs">
            <Button size="sm" variant="default" className="text-xs h-7">
              Cevap Yaz
            </Button>
            <Button size="sm" variant="outline" className="text-xs h-7">
              Takip Et
            </Button>
            <span className="ml-auto text-muted-foreground font-mono text-[11px]">
              ▲ 128 Beğeni · 34 Yorum
            </span>
          </div>
        </div>
      </Card>
    </div>
  )
}

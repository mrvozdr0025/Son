"use client"

import { useState, useTransition } from "react"
import { updateSiteSettings, type SiteSettingsData } from "@/app/actions/site-settings"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Activity,
  Search,
  DollarSign,
  Layers,
  Code2,
  FileCode,
  Save,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Sparkles,
  ExternalLink,
  ShieldCheck,
  Palette,
} from "lucide-react"

export function AdminSiteSettings({ initialSettings }: { initialSettings: SiteSettingsData }) {
  const [isPending, startTransition] = useTransition()
  const [status, setStatus] = useState<{ type: "success" | "error"; message: string } | null>(null)

  const [gaId, setGaId] = useState(initialSettings.googleAnalyticsId ?? "")
  const [gscCode, setGscCode] = useState(initialSettings.googleSearchConsoleCode ?? "")
  const [adsenseId, setAdsenseId] = useState(initialSettings.googleAdsenseId ?? "")
  const [gtmId, setGtmId] = useState(initialSettings.googleTagManagerId ?? "")
  const [customHead, setCustomHead] = useState(initialSettings.customHeadCode ?? "")
  const [customBody, setCustomBody] = useState(initialSettings.customBodyCode ?? "")
  const [siteTitle, setSiteTitle] = useState(initialSettings.siteTitle ?? "")
  const [siteDescription, setSiteDescription] = useState(initialSettings.siteDescription ?? "")
  const [defaultTheme, setDefaultTheme] = useState(initialSettings.defaultTheme ?? "system")

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setStatus(null)

    const formData = new FormData()
    formData.set("googleAnalyticsId", gaId)
    formData.set("googleSearchConsoleCode", gscCode)
    formData.set("googleAdsenseId", adsenseId)
    formData.set("googleTagManagerId", gtmId)
    formData.set("customHeadCode", customHead)
    formData.set("customBodyCode", customBody)
    formData.set("siteTitle", siteTitle)
    formData.set("siteDescription", siteDescription)
    formData.set("defaultTheme", defaultTheme)

    startTransition(async () => {
      const res = await updateSiteSettings(formData)
      if (res.success) {
        setStatus({
          type: "success",
          message: "Site ve entegrasyon ayarları başarıyla kaydedildi ve tüm sitede aktifleştirildi.",
        })
      } else {
        setStatus({
          type: "error",
          message: res.error || "Ayarlar kaydedilirken bir hata oluştu.",
        })
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {status && (
        <div
          role="alert"
          className={`flex items-center gap-3 p-4 rounded-xl text-sm font-medium border ${
            status.type === "success"
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
              : "bg-red-500/10 border-red-500/30 text-red-600 dark:text-red-400"
          }`}
        >
          {status.type === "success" ? (
            <CheckCircle2 className="size-5 shrink-0" />
          ) : (
            <AlertCircle className="size-5 shrink-0" />
          )}
          <span>{status.message}</span>
        </div>
      )}

      {/* 1. GOOGLE ENTEGRASYONLARI */}
      <Card className="p-6 border-border/80 shadow-md">
        <div className="flex items-center justify-between pb-4 mb-5 border-b border-border/60">
          <div className="flex items-center gap-2.5">
            <div className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Activity className="size-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground">Google Servis Entegrasyonları</h2>
              <p className="text-xs text-muted-foreground">
                Google Analytics, Search Console, AdSense ve Tag Manager bağlantılarını yönetin.
              </p>
            </div>
          </div>
          <span className="text-xs font-mono font-medium px-2.5 py-1 rounded-full bg-secondary text-secondary-foreground border border-border/60">
            SEO & Takip
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Google Analytics 4 */}
          <div className="space-y-2 p-4 rounded-xl border border-border/60 bg-card/50">
            <div className="flex items-center justify-between">
              <label htmlFor="gaId" className="text-sm font-semibold flex items-center gap-2">
                <Activity className="size-4 text-amber-500" />
                <span>Google Analytics 4 (GA4)</span>
              </label>
              {gaId.trim() ? (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-500 border border-emerald-500/30">
                  Aktif
                </span>
              ) : (
                <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                  Pasif
                </span>
              )}
            </div>
            <input
              id="gaId"
              type="text"
              value={gaId}
              onChange={(e) => setGaId(e.target.value)}
              placeholder="G-XXXXXXXXXX"
              className="w-full px-3.5 py-2 text-sm font-mono rounded-lg border border-input bg-background focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
            />
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Google Analytics Ölçüm Kimliği (Measurement ID). Sitenin tüm sayfalarında ziyaretçi trafiğini ve sayfa görüntülenmelerini otomatik kaydeder.
            </p>
          </div>

          {/* Google Search Console */}
          <div className="space-y-2 p-4 rounded-xl border border-border/60 bg-card/50">
            <div className="flex items-center justify-between">
              <label htmlFor="gscCode" className="text-sm font-semibold flex items-center gap-2">
                <Search className="size-4 text-blue-500" />
                <span>Google Search Console Doğrulama</span>
              </label>
              {gscCode.trim() ? (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-500 border border-emerald-500/30">
                  Doğrulanmış
                </span>
              ) : (
                <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                  Pasif
                </span>
              )}
            </div>
            <input
              id="gscCode"
              type="text"
              value={gscCode}
              onChange={(e) => setGscCode(e.target.value)}
              placeholder="google-site-verification token veya tam meta etiketi"
              className="w-full px-3.5 py-2 text-sm font-mono rounded-lg border border-input bg-background focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
            />
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Google Search Console HTML meta doğrulama kodu. Tam &lt;meta ...&gt; kodunu veya doğrudan içerik tokenını yapıştırabilirsiniz.
            </p>
          </div>

          {/* Google AdSense */}
          <div className="space-y-2 p-4 rounded-xl border border-border/60 bg-card/50">
            <div className="flex items-center justify-between">
              <label htmlFor="adsenseId" className="text-sm font-semibold flex items-center gap-2">
                <DollarSign className="size-4 text-emerald-500" />
                <span>Google AdSense (Yayıncı Kimliği)</span>
              </label>
              {adsenseId.trim() ? (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-500 border border-emerald-500/30">
                  Aktif
                </span>
              ) : (
                <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                  Pasif
                </span>
              )}
            </div>
            <input
              id="adsenseId"
              type="text"
              value={adsenseId}
              onChange={(e) => setAdsenseId(e.target.value)}
              placeholder="ca-pub-XXXXXXXXXXXXXXXX"
              className="w-full px-3.5 py-2 text-sm font-mono rounded-lg border border-input bg-background focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
            />
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Otomatik reklamlar ve Google reklam ağından gelir elde etmek için AdSense Yayıncı ID kodunuz.
            </p>
          </div>

          {/* Google Tag Manager (GTM) */}
          <div className="space-y-2 p-4 rounded-xl border border-border/60 bg-card/50">
            <div className="flex items-center justify-between">
              <label htmlFor="gtmId" className="text-sm font-semibold flex items-center gap-2">
                <Layers className="size-4 text-cyan-500" />
                <span>Google Tag Manager (GTM)</span>
              </label>
              {gtmId.trim() ? (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-500 border border-emerald-500/30">
                  Aktif
                </span>
              ) : (
                <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                  Pasif
                </span>
              )}
            </div>
            <input
              id="gtmId"
              type="text"
              value={gtmId}
              onChange={(e) => setGtmId(e.target.value)}
              placeholder="GTM-XXXXXXX"
              className="w-full px-3.5 py-2 text-sm font-mono rounded-lg border border-input bg-background focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
            />
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Tüm pazarlama ve izleme etiketlerinizi merkezi olarak yönetmek için GTM Konteyner Kimliği.
            </p>
          </div>
        </div>
      </Card>

      {/* 2. ÖZEL KOD ENJEKSİYONU (CUSTOM CODE INJECTION) */}
      <Card className="p-6 border-border/80 shadow-md">
        <div className="flex items-center justify-between pb-4 mb-5 border-b border-border/60">
          <div className="flex items-center gap-2.5">
            <div className="flex size-9 items-center justify-center rounded-xl bg-purple-500/10 text-purple-400">
              <Code2 className="size-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground">Özel Kod Enjeksiyonu (Head & Body)</h2>
              <p className="text-xs text-muted-foreground">
                Doğrulama etiketleri, harici CSS/JS kütüphaneleri, canlı destek ve izleme pikselleri ekleyin.
              </p>
            </div>
          </div>
          <span className="text-xs font-mono font-medium px-2.5 py-1 rounded-full bg-purple-500/15 text-purple-300 border border-purple-500/30">
            HTML / JS
          </span>
        </div>

        <div className="space-y-5">
          {/* Custom Head Code */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label htmlFor="customHead" className="text-sm font-semibold flex items-center gap-2">
                <FileCode className="size-4 text-purple-400" />
                <span>Custom &lt;head&gt; Kodu</span>
              </label>
              <span className="text-[11px] text-muted-foreground">
                HTML sayfasının &lt;head&gt; kapanışından önce enjekte edilir
              </span>
            </div>
            <textarea
              id="customHead"
              rows={4}
              value={customHead}
              onChange={(e) => setCustomHead(e.target.value)}
              placeholder="<!-- Özel meta etiketleri, font bağlantıları, harici stil veya scriptler -->&#10;<meta name='yandex-verification' content='...' />&#10;<link rel='stylesheet' href='...' />"
              className="w-full px-3.5 py-2.5 text-xs font-mono rounded-lg border border-input bg-zinc-950 text-zinc-100 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all leading-relaxed"
            />
          </div>

          {/* Custom Body Code */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label htmlFor="customBody" className="text-sm font-semibold flex items-center gap-2">
                <FileCode className="size-4 text-emerald-400" />
                <span>Custom &lt;body&gt; Kodu</span>
              </label>
              <span className="text-[11px] text-muted-foreground">
                Sayfanın &lt;/body&gt; kapanışından hemen önce enjekte edilir
              </span>
            </div>
            <textarea
              id="customBody"
              rows={4}
              value={customBody}
              onChange={(e) => setCustomBody(e.target.value)}
              placeholder="<!-- Canlı destek widget kodları (Crisp, Tawk.to), dönüşüm pikselleri veya body scriptleri -->&#10;<script>/* Özel JS */</script>"
              className="w-full px-3.5 py-2.5 text-xs font-mono rounded-lg border border-input bg-zinc-950 text-zinc-100 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all leading-relaxed"
            />
          </div>
        </div>
      </Card>

      {/* 3. SİTE BİLGİLERİ VE VARSAYILAN TEMA */}
      <Card className="p-6 border-border/80 shadow-md">
        <div className="flex items-center justify-between pb-4 mb-5 border-b border-border/60">
          <div className="flex items-center gap-2.5">
            <div className="flex size-9 items-center justify-center rounded-xl bg-amber-500/10 text-amber-500">
              <Palette className="size-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground">Genel Site & Tema Tercihleri</h2>
              <p className="text-xs text-muted-foreground">
                Ziyaretçiler için varsayılan tema ve özel site başlığı/açıklaması.
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="space-y-2">
            <label htmlFor="defaultTheme" className="text-sm font-semibold">
              Varsayılan Ziyaretçi Teması
            </label>
            <select
              id="defaultTheme"
              value={defaultTheme}
              onChange={(e) => setDefaultTheme(e.target.value as "system" | "dark" | "light")}
              className="w-full px-3.5 py-2 text-sm rounded-lg border border-input bg-background focus:border-primary focus:ring-1 focus:ring-primary outline-none"
            >
              <option value="system">Sistem Tercihi (Cihaza göre otomatik)</option>
              <option value="dark">Karanlık Mod (Varsayılan Koyu Tema)</option>
              <option value="light">Aydınlık Mod (Varsayılan Açık Tema)</option>
            </select>
          </div>

          <div className="space-y-2">
            <label htmlFor="siteTitle" className="text-sm font-semibold">
              Özel Site Başlığı Eki (Opsiyonel)
            </label>
            <input
              id="siteTitle"
              type="text"
              value={siteTitle}
              onChange={(e) => setSiteTitle(e.target.value)}
              placeholder="neonsform — Türkiye’nin AI Destekli Forumu"
              className="w-full px-3.5 py-2 text-sm rounded-lg border border-input bg-background focus:border-primary focus:ring-1 focus:ring-primary outline-none"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="siteDescription" className="text-sm font-semibold">
              Meta Açıklaması (Opsiyonel)
            </label>
            <input
              id="siteDescription"
              type="text"
              value={siteDescription}
              onChange={(e) => setSiteDescription(e.target.value)}
              placeholder="Teknoloji, oyun ve yapay zeka tartışma platformu..."
              className="w-full px-3.5 py-2 text-sm rounded-lg border border-input bg-background focus:border-primary focus:ring-1 focus:ring-primary outline-none"
            />
          </div>
        </div>
      </Card>

      {/* Kaydet Butonu */}
      <div className="flex items-center justify-end gap-3 pt-2">
        <Button
          type="submit"
          disabled={isPending}
          size="lg"
          className="gap-2 px-6 font-semibold glow-sm"
        >
          <Save className="size-4" />
          <span>{isPending ? "Kaydediliyor..." : "Ayarları Kaydet"}</span>
        </Button>
      </div>
    </form>
  )
}

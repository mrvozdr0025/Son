"use client"

import { useRef, useState, useTransition } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import {
  Loader2,
  KeyRound,
  Trash2,
  RotateCcw,
  Pause,
  Play,
  DatabaseZap,
  Cpu,
  Send,
  CheckCircle2,
  AlertCircle,
  Clock,
  Sparkles,
  Sliders,
  Copy,
  Check,
  Zap,
} from "lucide-react"
import {
  addApiKey,
  toggleApiKey,
  deleteApiKey,
  resetApiKeyBench,
  updateAISettings,
  updateAIModel,
  testAIModel,
  setAIPaused,
  clearAICache,
} from "@/app/actions/admin"
import { timeAgo } from "@/lib/format"
import type { TestResult } from "@/lib/ai/gemini"

type Settings = {
  modelId?: string
  temperature?: number
  maxTokens?: number
  dailyActionLimit: number
  isPaused: boolean
  pausedReason: string | null
  cacheTtlMinutes: number
  dailyUsed: number
  usageDate: string
}

type ApiKeyRow = {
  id: number
  name: string
  keyPreview: string
  priority: number
  isActive: boolean
  exhaustedUntil: Date | null
  errorCount: number
  lastUsedAt: Date | null
  createdAt: Date
}

type CacheStats = { entries: number; totalHits: number }

const PAUSE_REASONS: Record<string, string> = {
  manuel: "Admin tarafından manuel duraklatıldı",
  "auto:limit": "Günlük aksiyon limiti aşıldığı için otomatik duraklatıldı",
  "auto:keys": "Tüm API anahtarlarının kotası dolduğu için otomatik duraklatıldı",
}

const PRESET_MODELS = [
  {
    id: "gemini-3.8-flash",
    name: "Gemini 3.8 Flash",
    tag: "Önerilen",
    badgeColor: "bg-cyan-500/15 text-cyan-400 border-cyan-500/30",
    desc: "Varsayılan, hızlı ve dengeli. Forum botları, yorumlar ve anlık özetlemeler için ideal.",
    tier: "Hızlı / Dengeli",
  },
  {
    id: "gemini-3.1-flash-lite",
    name: "Gemini 3.1 Flash Lite",
    tag: "Ultra Hızlı",
    badgeColor: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
    desc: "En düşük gecikme ve maliyet. Hızlı filtreleme, spam analizi ve anlık kontroller için.",
    tier: "Hafif / Düşük Maliyet",
  },
  {
    id: "gemini-3.1-pro-preview",
    name: "Gemini 3.1 Pro (Preview)",
    tag: "Derin Mantık",
    badgeColor: "bg-purple-500/15 text-purple-400 border-purple-500/30",
    desc: "Karmaşık mantık yürütme, derinlemesine analiz ve uzun forum konuları üretimi.",
    tier: "Gelişmiş Zeka",
  },
  {
    id: "gemini-flash-latest",
    name: "Gemini Flash (En Güncel)",
    tag: "Otomatik Güncel",
    badgeColor: "bg-blue-500/15 text-blue-400 border-blue-500/30",
    desc: "Google'ın her an güncellenen en son kararlı Flash modeline doğrudan bağlanır.",
    tier: "Otomatik Güncel",
  },
]

const QUICK_TEST_PROMPTS = [
  {
    label: "👋 Selamlama",
    prompt: "Merhaba! Neonsform forum topluluğuna kısa ve samimi bir 'Hoş geldiniz' mesajı yaz.",
  },
  {
    label: "📌 Forum Özeti",
    prompt:
      "Aşağıdaki forum konusunu 2 maddede özetle:\n'RTX 5070 ekran kartı çıktı, fiyat/performans dengesi iyi fakat 12GB VRAM tartışmalara yol açıyor.'",
  },
  {
    label: "🛡️ Toksisite Analizi",
    prompt:
      "Şu cümlenin toksisitesini (0-100) ve hakaret içerip içermediğini değerlendir:\n'Bu paylaşım bana göre çok mantıksız ve eksik bilgi içeriyor.'",
  },
  {
    label: "❓ Teknik Soru",
    prompt: "Next.js App Router ile Server Action kullanmanın 2 temel avantajını tek cümleyle açıkla.",
  },
]

export function ApiKeyManager({
  settings,
  apiKeys,
  cacheStats,
}: {
  settings: Settings
  apiKeys: ApiKeyRow[]
  cacheStats: CacheStats
}) {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const addFormRef = useRef<HTMLFormElement>(null)

  // Model settings state
  const currentModelId = settings.modelId || "gemini-3.8-flash"
  const isCustomModel = !PRESET_MODELS.some((m) => m.id === currentModelId)
  const [selectedModel, setSelectedModel] = useState<string>(
    isCustomModel ? "custom" : currentModelId
  )
  const [customModelInput, setCustomModelInput] = useState<string>(
    isCustomModel ? currentModelId : ""
  )
  const [temperature, setTemperature] = useState<number>(settings.temperature ?? 1.0)
  const [maxTokens, setMaxTokens] = useState<number>(settings.maxTokens ?? 2048)

  // API Tester state
  const [testPrompt, setTestPrompt] = useState<string>(QUICK_TEST_PROMPTS[0].prompt)
  const [testModelTarget, setTestModelTarget] = useState<string>(currentModelId)
  const [isTesting, setIsTesting] = useState(false)
  const [testResult, setTestResult] = useState<TestResult | null>(null)
  const [copied, setCopied] = useState(false)

  function run(fn: () => Promise<unknown>) {
    setError(null)
    setSuccessMsg(null)
    startTransition(async () => {
      try {
        await fn()
      } catch (e) {
        setError(e instanceof Error ? e.message : "Bir hata oluştu")
      }
    })
  }

  async function handleSaveModel(e: React.FormEvent) {
    e.preventDefault()
    const targetModel = selectedModel === "custom" ? customModelInput.trim() : selectedModel
    if (!targetModel) {
      setError("Lütfen geçerli bir model adı girin veya seçin.")
      return
    }

    const fd = new FormData()
    fd.set("modelId", targetModel)
    fd.set("temperature", String(temperature))
    fd.set("maxTokens", String(maxTokens))

    run(async () => {
      const res = await updateAIModel(fd)
      setSuccessMsg(res.message)
      setTestModelTarget(targetModel)
    })
  }

  async function handleRunTest() {
    if (!testPrompt.trim()) {
      setError("Lütfen test için bir prompt girin.")
      return
    }
    setError(null)
    setIsTesting(true)
    setTestResult(null)
    try {
      const res = await testAIModel(testPrompt, testModelTarget)
      setTestResult(res)
    } catch (err: any) {
      setError(err?.message || "Test sırasında hata oluştu")
      setTestResult({
        success: false,
        modelId: testModelTarget,
        latencyMs: 0,
        keyPreview: "Hata",
        error: err?.message || "Test başarısız oldu",
      })
    } finally {
      setIsTesting(false)
    }
  }

  function copyResponse() {
    if (testResult?.text) {
      navigator.clipboard.writeText(testResult.text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const usagePct = Math.min(
    100,
    Math.round((settings.dailyUsed / Math.max(1, settings.dailyActionLimit)) * 100)
  )

  const activePreset = PRESET_MODELS.find((m) => m.id === currentModelId)

  return (
    <div className="flex flex-col gap-6">
      {/* ------------------------------------------------ Top Status Banner -- */}
      <Card className="flex flex-col gap-4 p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold">Yapay Zeka Durumu & Çalışma Modeli</h2>
              <Badge variant="outline" className="border-cyan-500/40 bg-cyan-500/10 text-cyan-400">
                <Cpu className="mr-1 size-3" />
                {currentModelId}
              </Badge>
              {settings.isPaused ? (
                <Badge variant="destructive">Durduruldu</Badge>
              ) : (
                <Badge className="bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                  <span className="mr-1.5 size-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Aktif
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {settings.isPaused
                ? (PAUSE_REASONS[settings.pausedReason ?? ""] ?? "Duraklatıldı")
                : `Tüm AI botları, tartışma yanıtları ve özetleme işlemleri ${activePreset ? activePreset.name : currentModelId} üzerinden yürütülüyor.`}
            </p>
          </div>
          <Button
            size="sm"
            variant={settings.isPaused ? "default" : "outline"}
            disabled={pending}
            onClick={() => run(() => setAIPaused(!settings.isPaused))}
            className="gap-1.5"
          >
            {settings.isPaused ? <Play className="size-4" /> : <Pause className="size-4" />}
            {settings.isPaused ? "Sistemi Devam Ettir" : "AI'yı Duraklat"}
          </Button>
        </div>

        <div>
          <div className="mb-1 flex justify-between text-xs text-muted-foreground">
            <span>
              Bugünkü API kullanımı: <strong className="text-foreground">{settings.dailyUsed}</strong> / {settings.dailyActionLimit} çağrı
            </span>
            <span>%{usagePct}</span>
          </div>
          <div
            role="progressbar"
            aria-valuenow={usagePct}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Günlük AI kullanımı"
            className="h-2 overflow-hidden rounded-full bg-secondary"
          >
            <div
              className={`h-full rounded-full transition-all ${
                usagePct >= 90 ? "bg-destructive" : "bg-primary"
              }`}
              style={{ width: `${usagePct}%` }}
            />
          </div>
        </div>
      </Card>

      {/* ------------------------------------------- Model Selection & Config -- */}
      <Card className="flex flex-col gap-5 p-5">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
          <div>
            <h2 className="flex items-center gap-2 text-sm font-semibold">
              <Cpu className="size-4 text-primary" /> Güncel Yapay Zeka Modelini Değiştirme
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Platform genelinde çalışan Gemini modelini anında değiştirebilir veya özel model tanımlayabilirsiniz.
            </p>
          </div>
          <Badge variant="secondary" className="font-mono text-xs">
            Mevcut: {currentModelId}
          </Badge>
        </div>

        <form onSubmit={handleSaveModel} className="flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {PRESET_MODELS.map((model) => {
              const isCurrent = currentModelId === model.id
              const isSelected = selectedModel === model.id
              return (
                <div
                  key={model.id}
                  onClick={() => setSelectedModel(model.id)}
                  className={`relative flex cursor-pointer flex-col justify-between rounded-xl border p-3.5 transition-all ${
                    isSelected
                      ? "border-primary bg-primary/10 shadow-sm"
                      : "border-border bg-card/60 hover:border-border/80 hover:bg-muted/30"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-medium text-sm text-foreground">{model.name}</span>
                        <Badge variant="outline" className={`text-[10px] py-0 px-1.5 ${model.badgeColor}`}>
                          {model.tag}
                        </Badge>
                      </div>
                      <span className="font-mono text-[11px] text-muted-foreground">{model.id}</span>
                    </div>
                    {isCurrent && (
                      <Badge className="bg-primary/20 text-primary border-primary/30 text-[10px]">
                        Kullanımda
                      </Badge>
                    )}
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground leading-relaxed">{model.desc}</p>
                </div>
              )
            })}
          </div>

          {/* Custom model option */}
          <div
            onClick={() => setSelectedModel("custom")}
            className={`cursor-pointer rounded-xl border p-3.5 transition-all ${
              selectedModel === "custom"
                ? "border-primary bg-primary/10"
                : "border-border bg-card/60 hover:bg-muted/30"
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <input
                  type="radio"
                  id="model-custom"
                  name="model-radio"
                  checked={selectedModel === "custom"}
                  onChange={() => setSelectedModel("custom")}
                  className="accent-primary"
                />
                <Label htmlFor="model-custom" className="cursor-pointer text-sm font-medium">
                  Özel / Manuel Model Kodu Girin
                </Label>
              </div>
              <Badge variant="outline" className="text-[10px]">Özel Giriş</Badge>
            </div>
            {selectedModel === "custom" && (
              <div className="mt-3 flex flex-col gap-1.5 pl-6">
                <Input
                  placeholder="Örn: gemini-3.8-flash veya gemini-3.1-pro-preview"
                  value={customModelInput}
                  onChange={(e) => setCustomModelInput(e.target.value)}
                  className="font-mono text-sm max-w-md bg-background"
                />
                <span className="text-[11px] text-muted-foreground">
                  Google Gemini SDK tarafından desteklenen model ID kodunu yazın.
                </span>
              </div>
            )}
          </div>

          {/* Hyperparameters */}
          <div className="grid grid-cols-1 gap-4 rounded-xl border border-border bg-card/40 p-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="temperature" className="text-xs font-medium">
                  Sıcaklık (Temperature): <span className="font-mono text-primary">{temperature.toFixed(2)}</span>
                </Label>
                <span className="text-[11px] text-muted-foreground">0.0 (Net) - 2.0 (Yaratıcı)</span>
              </div>
              <input
                id="temperature"
                type="range"
                min="0"
                max="2"
                step="0.05"
                value={temperature}
                onChange={(e) => setTemperature(parseFloat(e.target.value))}
                className="w-full accent-primary"
              />
              <span className="text-[11px] text-muted-foreground">
                Forum botları ve yorumlar için 0.7 - 1.0 aralığı tavsiye edilir.
              </span>
            </div>

            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="maxTokens" className="text-xs font-medium">
                  Maksimum Yanıt Token Limiti
                </Label>
                <span className="text-[11px] text-muted-foreground">128 - 8192 token</span>
              </div>
              <Input
                id="maxTokens"
                type="number"
                min={128}
                max={8192}
                step={128}
                value={maxTokens}
                onChange={(e) => setMaxTokens(parseInt(e.target.value) || 2048)}
                className="font-mono text-xs sm:w-48 bg-background"
              />
              <span className="text-[11px] text-muted-foreground">
                Modelin tek seferde üretebileceği maksimum metin uzunluğu.
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            <div className="text-xs">
              {successMsg && (
                <span className="flex items-center gap-1.5 text-emerald-400 font-medium">
                  <CheckCircle2 className="size-4" /> {successMsg}
                </span>
              )}
              {error && (
                <span className="flex items-center gap-1.5 text-destructive font-medium">
                  <AlertCircle className="size-4" /> {error}
                </span>
              )}
            </div>
            <Button type="submit" size="sm" disabled={pending} className="gap-1.5">
              {pending ? <Loader2 className="size-4 animate-spin" /> : <Sliders className="size-4" />}
              Modeli & Parametreleri Kaydet
            </Button>
          </div>
        </form>
      </Card>

      {/* ------------------------------------------------ Live API Sandbox -- */}
      <Card className="flex flex-col gap-4 p-5">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
          <div>
            <h2 className="flex items-center gap-2 text-sm font-semibold">
              <Zap className="size-4 text-amber-400" /> Canlı API Test Aracı (Sandbox)
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              API anahtarlarının geçerliliğini, yanıt süresini (gecikme/latency) ve model çıktısını gerçek zamanlı test edin.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Label htmlFor="test-model-select" className="text-xs text-muted-foreground">
              Test Modeli:
            </Label>
            <select
              id="test-model-select"
              value={testModelTarget}
              onChange={(e) => setTestModelTarget(e.target.value)}
              className="rounded-lg border border-border bg-card px-2.5 py-1 text-xs font-mono outline-none"
            >
              {PRESET_MODELS.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} ({m.id})
                </option>
              ))}
              {isCustomModel && <option value={currentModelId}>Özel ({currentModelId})</option>}
            </select>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          {/* Quick preset buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-muted-foreground">Hızlı Şablonlar:</span>
            {QUICK_TEST_PROMPTS.map((qp, i) => (
              <Button
                key={i}
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setTestPrompt(qp.prompt)}
                className="h-7 text-xs px-2.5 bg-background/50 hover:bg-primary/10"
              >
                {qp.label}
              </Button>
            ))}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="test-prompt" className="text-xs font-medium">
              Test Promptu / Soru
            </Label>
            <Textarea
              id="test-prompt"
              rows={3}
              value={testPrompt}
              onChange={(e) => setTestPrompt(e.target.value)}
              placeholder="Test için yapay zekaya bir soru veya yönerge yazın..."
              className="bg-background font-sans text-sm resize-y"
            />
          </div>

          <div className="flex items-center justify-between">
            <span className="text-[11px] text-muted-foreground">
              * Test çağrıları önbelleği (cache) atlar ve doğrudan Gemini API uç noktasına istek atar.
            </span>
            <Button
              type="button"
              size="sm"
              disabled={isTesting}
              onClick={handleRunTest}
              className="gap-1.5 bg-primary text-primary-foreground"
            >
              {isTesting ? (
                <>
                  <Loader2 className="size-4 animate-spin" /> Test Ediliyor...
                </>
              ) : (
                <>
                  <Send className="size-4" /> API&apos;yi Test Et
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Test Result Display */}
        {testResult && (
          <div
            className={`mt-2 rounded-xl border p-4 transition-all ${
              testResult.success
                ? "border-emerald-500/30 bg-emerald-500/5"
                : "border-destructive/40 bg-destructive/5"
            }`}
          >
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-2.5">
              <div className="flex items-center gap-2">
                {testResult.success ? (
                  <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/40 text-xs">
                    <CheckCircle2 className="mr-1 size-3.5" /> 200 OK — Başarılı
                  </Badge>
                ) : (
                  <Badge variant="destructive" className="text-xs">
                    <AlertCircle className="mr-1 size-3.5" /> Test Başarısız
                  </Badge>
                )}
                <span className="font-mono text-xs text-muted-foreground">
                  Model: <strong className="text-foreground">{testResult.modelId}</strong>
                </span>
              </div>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1 font-mono">
                  <Clock className="size-3.5 text-primary" /> {testResult.latencyMs} ms
                </span>
                <span className="font-mono">Anahtar: {testResult.keyPreview}</span>
                {testResult.charCount !== undefined && (
                  <span className="font-mono">{testResult.charCount} karakter</span>
                )}
              </div>
            </div>

            {testResult.success ? (
              <div className="mt-3 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-muted-foreground">Model Yanıtı:</span>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={copyResponse}
                    className="h-6 gap-1 px-2 text-xs text-muted-foreground hover:text-foreground"
                  >
                    {copied ? <Check className="size-3 text-emerald-400" /> : <Copy className="size-3" />}
                    {copied ? "Kopyalandı" : "Yanıtı Kopyala"}
                  </Button>
                </div>
                <div className="rounded-lg border border-border/80 bg-background/80 p-3 text-sm leading-relaxed whitespace-pre-wrap font-sans text-foreground">
                  {testResult.text}
                </div>
              </div>
            ) : (
              <div className="mt-3 flex flex-col gap-1.5">
                <span className="text-xs font-semibold text-destructive">Hata Ayrıntısı:</span>
                <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-xs font-mono text-destructive">
                  {testResult.error}
                </div>
                <p className="text-[11px] text-muted-foreground mt-1">
                  İpucu: API anahtarınızın kotasının tükenmediğini, Google AI Studio üzerinde aktif olduğunu veya model adının doğru yazıldığını kontrol edin.
                </p>
              </div>
            )}
          </div>
        )}
      </Card>

      {/* ------------------------------------------------------ Quota Settings -- */}
      <Card className="flex flex-col gap-3 p-5">
        <h2 className="text-sm font-semibold">Günlük Kota & Önbellek (Cache) Ayarları</h2>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            const fd = new FormData(e.currentTarget)
            run(() => updateAISettings(fd))
          }}
          className="grid grid-cols-1 items-end gap-3 sm:grid-cols-[auto_auto_auto]"
        >
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="dailyActionLimit">Günlük AI Aksiyon Limiti</Label>
            <Input
              id="dailyActionLimit"
              name="dailyActionLimit"
              type="number"
              min={1}
              max={10000}
              defaultValue={settings.dailyActionLimit}
              className="sm:w-40 bg-background"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="cacheTtlMinutes">Cache Süresi (dakika)</Label>
            <Input
              id="cacheTtlMinutes"
              name="cacheTtlMinutes"
              type="number"
              min={0}
              max={43200}
              defaultValue={settings.cacheTtlMinutes}
              className="sm:w-40 bg-background"
            />
          </div>
          <Button type="submit" size="sm" disabled={pending} className="w-full sm:w-auto">
            {pending && <Loader2 className="size-4 animate-spin" />}
            Ayarları Kaydet
          </Button>
        </form>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <DatabaseZap className="size-4 text-primary" />
            <span>
              Cache: <strong>{cacheStats.entries}</strong> kayıt, toplam <strong>{cacheStats.totalHits}</strong> isabet
              (her isabet 1 API çağrısı tasarrufu sağlar)
            </span>
          </div>
          <Button
            size="sm"
            variant="ghost"
            disabled={pending}
            onClick={() => run(clearAICache)}
          >
            Önbelleği Boşalt
          </Button>
        </div>
      </Card>

      {/* ------------------------------------------------------ Add Key -- */}
      <Card className="flex flex-col gap-3 p-5">
        <h2 className="text-sm font-semibold">Yeni Gemini API Anahtarı Ekle</h2>
        <p className="text-xs text-muted-foreground">
          Birden fazla Gemini API anahtarı ekleyebilirsiniz. Anahtarlar öncelik sırasına göre
          denenir; kotası dolan anahtar 6 saat dinlendirilir ve sıradaki anahtar otomatik devreye girer.
        </p>
        <form
          ref={addFormRef}
          onSubmit={(e) => {
            e.preventDefault()
            const fd = new FormData(e.currentTarget)
            run(async () => {
              await addApiKey(fd)
              addFormRef.current?.reset()
            })
          }}
          className="grid grid-cols-1 items-end gap-3 sm:grid-cols-[1fr_2fr_auto_auto]"
        >
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="key-name">İsim / Etiket</Label>
            <Input id="key-name" name="name" placeholder="Ana hesap veya Yedek-1" required className="bg-background" />
          </div>
          <div className="flex min-w-0 flex-col gap-1.5">
            <Label htmlFor="key-value">API Anahtarı</Label>
            <Input
              id="key-value"
              name="apiKey"
              type="password"
              placeholder="AIza..."
              required
              autoComplete="off"
              className="font-mono bg-background"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="key-priority">Öncelik (0: İlk denenen)</Label>
            <Input
              id="key-priority"
              name="priority"
              type="number"
              min={0}
              defaultValue={apiKeys.length}
              className="sm:w-24 bg-background"
            />
          </div>
          <Button type="submit" size="sm" disabled={pending} className="w-full sm:w-auto gap-1.5">
            {pending ? <Loader2 className="size-4 animate-spin" /> : <KeyRound className="size-4" />}
            Anahtar Ekle
          </Button>
        </form>
      </Card>

      {/* ----------------------------------------------------- Key List -- */}
      <Card className="p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold">API Anahtar Havuzu ({apiKeys.length})</h2>
          <Badge variant="outline" className="text-xs">
            Yedek: Ortam Değişkeni (GEMINI_API_KEY)
          </Badge>
        </div>
        {apiKeys.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Veritabanında kayıtlı ek anahtar bulunmuyor. Sistem sunucu ortam değişkenindeki
            (GEMINI_API_KEY) anahtarı temel alarak çalışıyor.
          </p>
        ) : (
          <ul className="flex flex-col divide-y divide-border">
            {apiKeys.map((k) => {
              const benched =
                k.exhaustedUntil != null && new Date(k.exhaustedUntil) > new Date()
              return (
                <li key={k.id} className="flex flex-wrap items-center gap-3 py-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-medium">{k.name}</p>
                      <Badge variant="outline" className="font-mono text-xs">
                        {k.keyPreview}
                      </Badge>
                      <Badge variant="secondary" className="text-xs">
                        Öncelik {k.priority}
                      </Badge>
                      {benched ? (
                        <Badge variant="destructive" className="text-xs">
                          Kota doldu — {timeAgo(k.exhaustedUntil!)} dinlenmede
                        </Badge>
                      ) : k.isActive ? (
                        <Badge className="bg-primary/15 text-primary text-xs border border-primary/30">
                          Hazır
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="text-xs">
                          Pasif
                        </Badge>
                      )}
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {k.errorCount} kota hatası
                      {k.lastUsedAt ? ` · son kullanım ${timeAgo(k.lastUsedAt)}` : " · henüz kullanılmadı"}
                    </p>
                  </div>
                  {benched && (
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={pending}
                      onClick={() => run(() => resetApiKeyBench(k.id))}
                      aria-label={`${k.name} dinlenmeyi sıfırla`}
                      className="gap-1 text-xs"
                    >
                      <RotateCcw className="size-3.5" />
                      Sıfırla
                    </Button>
                  )}
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={k.isActive}
                      onCheckedChange={(v) => run(() => toggleApiKey(k.id, v))}
                      aria-label={`${k.name} aktif/pasif`}
                    />
                    <Button
                      size="icon-sm"
                      variant="ghost"
                      disabled={pending}
                      onClick={() => {
                        if (confirm(`"${k.name}" anahtarı silinsin mi?`)) {
                          run(() => deleteApiKey(k.id))
                        }
                      }}
                      aria-label={`${k.name} sil`}
                    >
                      <Trash2 className="size-4 text-destructive" />
                    </Button>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </Card>
    </div>
  )
}

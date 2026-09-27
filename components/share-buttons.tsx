"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Share2, Check, Copy, Eye, Sparkles, MessageCircle, Send, Globe, X } from "lucide-react"

export function ShareButtons({
  title,
  slug,
  categoryName,
}: {
  title: string
  slug: string
  categoryName?: string
}) {
  const [copied, setCopied] = useState(false)
  const [showCardPreview, setShowCardPreview] = useState(false)

  // Construct absolute URL safely on the client
  const url =
    typeof window !== "undefined"
      ? `${window.location.origin}/konu/${slug}`
      : `https://neonsform.com/konu/${slug}`

  const ogImageUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/konu/${slug}/opengraph-image`
      : `https://neonsform.com/konu/${slug}/opengraph-image`

  const encodedUrl = encodeURIComponent(url)
  const encodedText = encodeURIComponent(`${title} — neonsform`)

  function copyLink() {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  async function handleNativeShare() {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${title} — neonsform`,
          text: `neonsform'da tartışmaya katılın: ${title}`,
          url,
        })
      } catch {
        // User cancelled or share failed
      }
    } else {
      copyLink()
    }
  }

  const shareOptions = [
    {
      name: "WhatsApp",
      href: `https://api.whatsapp.com/send?text=${encodedText}%20${encodedUrl}`,
      color: "hover:text-[#25D366] hover:border-[#25D366]/40",
      label: "WhatsApp",
      icon: MessageCircle,
      iconColor: "text-[#25D366]",
    },
    {
      name: "X (Twitter)",
      href: `https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`,
      color: "hover:text-foreground hover:border-foreground/50",
      label: "X (Twitter)",
      icon: X,
      iconColor: "text-foreground",
    },
    {
      name: "Telegram",
      href: `https://t.me/share/url?url=${encodedUrl}&text=${encodedText}`,
      color: "hover:text-[#229ED9] hover:border-[#229ED9]/40",
      label: "Telegram",
      icon: Send,
      iconColor: "text-[#229ED9]",
    },
    {
      name: "LinkedIn",
      href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
      color: "hover:text-[#0A66C2] hover:border-[#0A66C2]/40",
      label: "LinkedIn",
      icon: Globe,
      iconColor: "text-[#0A66C2]",
    },
    {
      name: "Facebook",
      href: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
      color: "hover:text-[#1877F2] hover:border-[#1877F2]/40",
      label: "Facebook",
      icon: Share2,
      iconColor: "text-[#1877F2]",
    },
  ]

  return (
    <div className="flex flex-col gap-2 pt-3 border-t border-border/50 text-xs">
      <div className="flex flex-wrap items-center gap-2">
        <span className="flex items-center gap-1.5 font-medium text-muted-foreground mr-1">
          <Share2 className="size-3.5" /> Paylaş:
        </span>

        {shareOptions.map((opt) => {
          const Icon = opt.icon
          return (
            <a
              key={opt.name}
              href={opt.href}
              target="_blank"
              rel="noopener noreferrer"
              className={`inline-flex items-center gap-1.5 rounded-md border border-border bg-card/60 px-2.5 py-1 text-xs text-foreground transition-all hover:bg-card ${opt.color}`}
              title={`${opt.name} ile paylaş`}
            >
              <Icon className={`size-3.5 ${opt.iconColor}`} />
              <span>{opt.label}</span>
            </a>
          )
        })}

        <Button
          variant="outline"
          size="sm"
          onClick={copyLink}
          className="h-7 px-2.5 text-xs gap-1.5 bg-card/60 border-border"
          title="Bağlantıyı panoya kopyala"
        >
          {copied ? (
            <>
              <Check className="size-3 text-emerald-400" />
              <span className="text-emerald-400 font-semibold">Kopyalandı!</span>
            </>
          ) : (
            <>
              <Copy className="size-3" />
              <span>Linki Kopyala</span>
            </>
          )}
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowCardPreview(!showCardPreview)}
          className="h-7 px-2 text-xs gap-1 text-muted-foreground hover:text-foreground"
          title="Sosyal kart görselini incele"
        >
          <Eye className="size-3" />
          <span>Kart Önizle</span>
        </Button>
      </div>

      {showCardPreview && (
        <div className="mt-2 rounded-xl border border-border/80 bg-muted/40 p-3 animate-in fade-in zoom-in-95">
          <div className="flex items-center justify-between text-[11px] text-muted-foreground mb-2">
            <span className="flex items-center gap-1 font-semibold text-primary">
              <Sparkles className="size-3" /> Zengin Sosyal Medya Paylaşım Kartı (Open Graph 1200x630)
            </span>
            <span>Otomatik Oluşturuldu</span>
          </div>
          <div className="overflow-hidden rounded-lg border border-border bg-black/40 aspect-[1200/630] max-h-56 relative flex items-center justify-center">
            <img
              src={`/konu/${slug}/opengraph-image`}
              alt={title}
              className="w-full h-full object-cover"
              loading="lazy"
            />
          </div>
        </div>
      )}
    </div>
  )
}

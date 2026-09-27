"use client"

import { useState } from "react"
import { Check, Copy, ExternalLink, Globe, MessageCircle, Send, Share2, Sparkles, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"

interface CommentShareDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  commentId: number
  commentText: string
  authorUsername: string
  topicTitle: string
  topicSlug: string
  score: number
  isAccepted?: boolean
}

export function CommentShareDialog({
  open,
  onOpenChange,
  commentId,
  commentText,
  authorUsername,
  topicTitle,
  topicSlug,
  score,
  isAccepted,
}: CommentShareDialogProps) {
  const [copiedLink, setCopiedLink] = useState(false)
  const [copiedQuote, setCopiedQuote] = useState(false)

  const origin = typeof window !== "undefined" ? window.location.origin : "https://neonsform.com"
  const commentUrl = `${origin}/konu/${topicSlug}#yorum-${commentId}`
  const encodedUrl = encodeURIComponent(commentUrl)
  const shareText = `"${commentText.slice(0, 140)}..." — @${authorUsername} (${topicTitle})`
  const encodedText = encodeURIComponent(shareText)

  const ogCardUrl = `${origin}/api/og/comment?author=${encodeURIComponent(
    authorUsername
  )}&topic=${encodeURIComponent(topicTitle)}&text=${encodeURIComponent(
    commentText.slice(0, 200)
  )}&score=${score}${isAccepted ? "&accepted=true" : ""}`

  const copyLink = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(commentUrl)
      setCopiedLink(true)
      setTimeout(() => setCopiedLink(false), 2000)
    }
  }

  const copyQuote = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(`> ${commentText}\n\n— @${authorUsername}, ${commentUrl}`)
      setCopiedQuote(true)
      setTimeout(() => setCopiedQuote(false), 2000)
    }
  }

  const shareNetworks = [
    {
      name: "WhatsApp",
      href: `https://api.whatsapp.com/send?text=${encodedText}%20${encodedUrl}`,
      color: "hover:border-[#25D366] hover:text-[#25D366]",
      icon: MessageCircle,
      iconColor: "text-[#25D366]",
    },
    {
      name: "X (Twitter)",
      href: `https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`,
      color: "hover:border-foreground/50 hover:text-foreground",
      icon: X,
      iconColor: "text-foreground",
    },
    {
      name: "Telegram",
      href: `https://t.me/share/url?url=${encodedUrl}&text=${encodedText}`,
      color: "hover:border-[#229ED9] hover:text-[#229ED9]",
      icon: Send,
      iconColor: "text-[#229ED9]",
    },
    {
      name: "LinkedIn",
      href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
      color: "hover:border-[#0A66C2] hover:text-[#0A66C2]",
      icon: Globe,
      iconColor: "text-[#0A66C2]",
    },
    {
      name: "Facebook",
      href: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
      color: "hover:border-[#1877F2] hover:text-[#1877F2]",
      icon: Share2,
      iconColor: "text-[#1877F2]",
    },
  ]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg border-border bg-card p-6 shadow-2xl">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Share2 className="size-4" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-foreground">
                Yorumu Paylaş & Sosyal Kart
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Bu yanıt için doğrudan bağlantı veya sosyal medya önizleme kartı oluşturun.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Live Social Card Preview */}
        <div className="mt-3 overflow-hidden rounded-xl border border-border/80 bg-gradient-to-br from-slate-900 to-slate-950 p-4 shadow-inner">
          <div className="flex items-center justify-between text-[11px] text-muted-foreground mb-2">
            <span className="flex items-center gap-1 text-cyan-400 font-semibold">
              <Sparkles className="size-3" /> Canlı Sosyal Kart Önizlemesi
            </span>
            <span className="font-mono">neonsform</span>
          </div>

          <div className="rounded-lg bg-slate-800/60 p-3.5 border border-slate-700/60">
            <div className="flex items-center gap-2 mb-2">
              <div className="size-6 rounded-full bg-cyan-600 flex items-center justify-center text-white text-[11px] font-bold">
                {authorUsername.charAt(0).toUpperCase()}
              </div>
              <span className="text-xs font-semibold text-white">@{authorUsername}</span>
              {isAccepted && (
                <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-400">
                  ✓ En İyi Çözüm
                </span>
              )}
            </div>
            <p className="text-xs text-slate-200 line-clamp-3 italic">
              “{commentText}”
            </p>
            <div className="mt-2 text-[10px] text-slate-400 flex items-center justify-between border-t border-slate-700/50 pt-2">
              <span>{topicTitle}</span>
              <span className="text-cyan-400 font-semibold">▲ {score} Puan</span>
            </div>
          </div>
        </div>

        {/* Quick Share Buttons */}
        <div className="mt-4 flex flex-wrap gap-2">
          {shareNetworks.map((net) => {
            const Icon = net.icon
            return (
              <a
                key={net.name}
                href={net.href}
                target="_blank"
                rel="noopener noreferrer"
                className={`flex-1 min-w-[100px] inline-flex items-center justify-center gap-1.5 rounded-lg border border-border bg-card/50 py-2 text-xs font-medium text-foreground transition-all hover:bg-muted ${net.color}`}
              >
                <Icon className={`size-3.5 ${net.iconColor}`} />
                <span>{net.name}</span>
              </a>
            )
          })}
        </div>

        {/* Action Copy buttons */}
        <div className="mt-2 flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={copyLink}
            className="flex-1 gap-1.5 text-xs"
          >
            {copiedLink ? (
              <>
                <Check className="size-3.5 text-emerald-500" />
                <span className="text-emerald-500 font-medium">Link Kopyalandı</span>
              </>
            ) : (
              <>
                <Copy className="size-3.5" />
                <span>Yorum Linkini Kopyala</span>
              </>
            )}
          </Button>

          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={copyQuote}
            className="flex-1 gap-1.5 text-xs"
          >
            {copiedQuote ? (
              <>
                <Check className="size-3.5 text-emerald-500" />
                <span className="text-emerald-500 font-medium">Alıntı Kopyalandı</span>
              </>
            ) : (
              <>
                <ExternalLink className="size-3.5" />
                <span>Alıntı Olarak Kopyala</span>
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

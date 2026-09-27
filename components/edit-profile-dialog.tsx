"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Edit3, X, Image as ImageIcon, User, Check, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { updateProfile } from "@/app/actions/profile"

interface Props {
  initialDisplayName: string
  initialBio?: string | null
  initialAvatarUrl?: string | null
  initialCoverUrl?: string | null
  username: string
}

const AVATAR_PRESETS = [
  { name: "Cyberpunk", url: "https://api.dicebear.com/7.x/bottts-neutral/svg?seed=Cyberpunk&backgroundColor=161b22" },
  { name: "Neon Hacker", url: "https://api.dicebear.com/7.x/bottts-neutral/svg?seed=NeonHacker&backgroundColor=0d1117" },
  { name: "Synthwave", url: "https://api.dicebear.com/7.x/bottts-neutral/svg?seed=Synthwave&backgroundColor=1f1b2e" },
  { name: "Quantum", url: "https://api.dicebear.com/7.x/bottts-neutral/svg?seed=Quantum&backgroundColor=111827" },
  { name: "Pixel Knight", url: "https://api.dicebear.com/7.x/pixel-art/svg?seed=Knight" },
  { name: "Cyber Cat", url: "https://api.dicebear.com/7.x/bottts-neutral/svg?seed=CyberCat" },
]

const COVER_PRESETS = [
  {
    name: "Neon City",
    url: "https://images.unsplash.com/photo-1508739773434-c26b3d09e071?w=1200&auto=format&fit=crop&q=80",
  },
  {
    name: "Cyber Grid",
    url: "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=1200&auto=format&fit=crop&q=80",
  },
  {
    name: "Retro Synthwave",
    url: "https://images.unsplash.com/photo-1518770660439-4636190af475?w=1200&auto=format&fit=crop&q=80",
  },
  {
    name: "Nebula",
    url: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1200&auto=format&fit=crop&q=80",
  },
]

export function EditProfileDialog({
  initialDisplayName,
  initialBio,
  initialAvatarUrl,
  initialCoverUrl,
  username,
}: Props) {
  const [isOpen, setIsOpen] = useState(false)
  const [displayName, setDisplayName] = useState(initialDisplayName)
  const [bio, setBio] = useState(initialBio || "")
  const [avatarUrl, setAvatarUrl] = useState(initialAvatarUrl || "")
  const [coverUrl, setCoverUrl] = useState(initialCoverUrl || "")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const res = await updateProfile({
      displayName,
      bio,
      avatarUrl,
      coverUrl,
    })

    setLoading(false)

    if (res.success) {
      setIsOpen(false)
      router.refresh()
    } else {
      setError(res.error || "Profil güncellenemedi.")
    }
  }

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(true)}
        className="gap-1.5 border-white/25 bg-white/10 hover:bg-white/20 text-white font-medium shadow-xs transition-colors"
      >
        <Edit3 className="size-3.5 text-cyan-300" />
        <span>Profili Düzenle</span>
      </Button>

      {isOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150"
          onClick={() => setIsOpen(false)}
        >
          <div
            className="w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-2xl bg-card border border-border p-6 shadow-2xl text-card-foreground animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-border">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-primary/10 text-primary">
                  <User className="size-5" />
                </div>
                <div>
                  <h2 className="font-semibold text-lg text-foreground">Profili Düzenle</h2>
                  <p className="text-xs text-muted-foreground">@{username} profil bilgilerinizi güncelleyin</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsOpen(false)}
                className="rounded-full size-8"
              >
                <X className="size-4" />
              </Button>
            </div>

            {error && (
              <div className="mb-4 p-3 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive text-sm">
                {error}
              </div>
            )}

            <form onSubmit={handleSave} className="space-y-5">
              {/* Cover Preview & Presets */}
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <ImageIcon className="size-3.5" />
                  Kapak Fotoğrafı
                </label>
                <div className="relative h-28 w-full rounded-xl overflow-hidden border border-border bg-muted/30">
                  {coverUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={coverUrl}
                      alt="Kapak önizlemesi"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground bg-gradient-to-r from-primary/10 via-accent/10 to-purple-500/10">
                      Özel bir kapak fotoğrafı seçin veya URL girin
                    </div>
                  )}
                  {coverUrl && (
                    <button
                      type="button"
                      onClick={() => setCoverUrl("")}
                      className="absolute top-2 right-2 p-1.5 rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors text-xs"
                      title="Kapağı kaldır"
                    >
                      <X className="size-3.5" />
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2 overflow-x-auto py-1">
                  <span className="text-[11px] text-muted-foreground shrink-0">Hazır temalar:</span>
                  {COVER_PRESETS.map((p) => (
                    <button
                      key={p.name}
                      type="button"
                      onClick={() => setCoverUrl(p.url)}
                      className={`text-[11px] px-2.5 py-1 rounded-lg border transition-colors shrink-0 ${
                        coverUrl === p.url
                          ? "border-primary bg-primary/20 text-primary font-medium"
                          : "border-border bg-muted/40 hover:bg-muted text-muted-foreground"
                      }`}
                    >
                      {p.name}
                    </button>
                  ))}
                </div>

                <Input
                  placeholder="Veya görsel bağlantısı yapıştırın (https://...)"
                  value={coverUrl}
                  onChange={(e) => setCoverUrl(e.target.value)}
                  className="text-xs h-9"
                />
              </div>

              {/* Avatar Preview & Presets */}
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <User className="size-3.5" />
                  Profil Resmi (Avatar)
                </label>
                <div className="flex items-center gap-4">
                  <Avatar className="size-16 ring-2 ring-primary/40 shrink-0">
                    <AvatarImage src={avatarUrl || undefined} alt="Avatar önizlemesi" />
                    <AvatarFallback className="text-lg">
                      {displayName.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 space-y-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      {AVATAR_PRESETS.map((p) => (
                        <button
                          key={p.name}
                          type="button"
                          onClick={() => setAvatarUrl(p.url)}
                          className={`size-8 rounded-full border overflow-hidden p-0.5 transition-transform hover:scale-110 ${
                            avatarUrl === p.url ? "border-primary ring-2 ring-primary/40 scale-105" : "border-border"
                          }`}
                          title={p.name}
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={p.url} alt={p.name} className="size-full rounded-full object-cover" />
                        </button>
                      ))}
                    </div>
                    <Input
                      placeholder="Veya avatar URL'si (https://...)"
                      value={avatarUrl}
                      onChange={(e) => setAvatarUrl(e.target.value)}
                      className="text-xs h-9"
                    />
                  </div>
                </div>
              </div>

              {/* Display Name */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Görünen İsim
                </label>
                <Input
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  maxLength={40}
                  required
                  placeholder="Görünen isminiz"
                />
              </div>

              {/* Bio */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Hakkımda (Bio)
                  </label>
                  <span className="text-[11px] text-muted-foreground">
                    {bio.length} / 500
                  </span>
                </div>
                <Textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  maxLength={500}
                  rows={3}
                  placeholder="Kendinizden, ilgi alanlarınızdan veya uzmanlıklarınızdan bahsedin..."
                  className="resize-none text-sm"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setIsOpen(false)}
                  disabled={loading}
                >
                  İptal
                </Button>
                <Button
                  type="submit"
                  disabled={loading || !displayName.trim()}
                  className="glow-sm"
                >
                  {loading ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      Kaydediliyor...
                    </>
                  ) : (
                    <>
                      <Check className="size-4" />
                      Değişiklikleri Kaydet
                    </>
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}

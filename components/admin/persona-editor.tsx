"use client"

import { useState, useTransition } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Loader2 } from "lucide-react"
import { createPersona, updatePersona } from "@/app/actions/admin"

export type PersonaFormData = {
  id?: number
  displayName: string
  username: string
  bio: string | null
  avatarUrl: string | null
  systemPrompt: string
  writingStyle: string
  opinionStyle: string
  emojiStyle: string
  interests: string[]
  activeHourStart: number
  activeHourEnd: number
  typoRate: number
}

export function PersonaEditor({
  open,
  onOpenChange,
  persona,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  persona: PersonaFormData | null // null = create mode
}) {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const isEdit = persona?.id != null

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const formData = new FormData(e.currentTarget)
    startTransition(async () => {
      try {
        if (isEdit && persona?.id) {
          await updatePersona(persona.id, formData)
        } else {
          await createPersona(formData)
        }
        onOpenChange(false)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Bir hata oluştu")
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "AI Kullanıcı Düzenle" : "Yeni AI Kullanıcı"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Persona ayarlarını güncelle. Değişiklikler bir sonraki AI aktivitesinden itibaren geçerli olur."
              : "Foruma yeni bir yapay zeka karakteri ekle."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="p-displayName">Görünen Ad</Label>
              <Input
                id="p-displayName"
                name="displayName"
                defaultValue={persona?.displayName ?? ""}
                placeholder="Sinema Delisi"
                required
                maxLength={40}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="p-username">Kullanıcı Adı</Label>
              <Input
                id="p-username"
                name="username"
                defaultValue={persona?.username ?? ""}
                placeholder="sinemadelisi"
                disabled={isEdit}
                required={!isEdit}
                maxLength={24}
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="p-bio">Bio</Label>
            <Input
              id="p-bio"
              name="bio"
              defaultValue={persona?.bio ?? ""}
              placeholder="Kısa profil açıklaması"
              maxLength={200}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="p-avatarUrl">Avatar URL</Label>
            <Input
              id="p-avatarUrl"
              name="avatarUrl"
              defaultValue={persona?.avatarUrl ?? ""}
              placeholder="/avatars/ornek.png veya https://..."
              maxLength={500}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="p-systemPrompt">Sistem Promptu (karakter tanımı)</Label>
            <Textarea
              id="p-systemPrompt"
              name="systemPrompt"
              defaultValue={persona?.systemPrompt ?? ""}
              placeholder="Sen 25 yaşında sinema tutkunu birisin. Filmler hakkında ateşli tartışırsın..."
              required
              rows={5}
              maxLength={4000}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="p-writingStyle">Yazım Stili</Label>
            <Textarea
              id="p-writingStyle"
              name="writingStyle"
              defaultValue={persona?.writingStyle ?? ""}
              placeholder="Kısa cümleler, bolca film referansı, arada büyük harfle vurgular"
              required
              rows={2}
              maxLength={500}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="p-interests">İlgi Alanları (virgülle ayır)</Label>
            <Input
              id="p-interests"
              name="interests"
              defaultValue={persona?.interests?.join(", ") ?? ""}
              placeholder="sinema, diziler, kultur-sanat"
            />
            <p className="text-xs text-muted-foreground">
              Kategori slug&apos;ları ile eşleşirse persona o kategorilerde daha aktif olur.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="p-opinionStyle">Görüş Tarzı</Label>
              <Input
                id="p-opinionStyle"
                name="opinionStyle"
                defaultValue={persona?.opinionStyle ?? "dengeli"}
                placeholder="agresif / dengeli / alaycı..."
                maxLength={50}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="p-emojiStyle">Emoji Kullanımı</Label>
              <Input
                id="p-emojiStyle"
                name="emojiStyle"
                defaultValue={persona?.emojiStyle ?? "orta"}
                placeholder="yok / az / orta / bol"
                maxLength={20}
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="p-activeHourStart">Aktif Başlangıç (saat)</Label>
              <Input
                id="p-activeHourStart"
                name="activeHourStart"
                type="number"
                min={0}
                max={23}
                defaultValue={persona?.activeHourStart ?? 8}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="p-activeHourEnd">Aktif Bitiş (saat)</Label>
              <Input
                id="p-activeHourEnd"
                name="activeHourEnd"
                type="number"
                min={0}
                max={23}
                defaultValue={persona?.activeHourEnd ?? 23}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="p-typoRate">Typo Oranı (0-0.3)</Label>
              <Input
                id="p-typoRate"
                name="typoRate"
                type="number"
                min={0}
                max={0.3}
                step={0.01}
                defaultValue={persona?.typoRate ?? 0.05}
              />
            </div>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              İptal
            </Button>
            <Button type="submit" disabled={pending}>
              {pending && <Loader2 className="size-4 animate-spin" />}
              {isEdit ? "Kaydet" : "Oluştur"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

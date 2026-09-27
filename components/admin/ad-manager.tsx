"use client"

import { useRef, useTransition } from "react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { createAd, deleteAd, toggleAd } from "@/app/actions/admin"
import { Trash2 } from "lucide-react"

type Ad = {
  id: number
  title: string
  linkUrl: string
  imageUrl: string | null
  slot: string
  isActive: boolean
}

export function AdManager({ ads }: { ads: Ad[] }) {
  const [pending, startTransition] = useTransition()
  const formRef = useRef<HTMLFormElement>(null)

  return (
    <div className="flex flex-col gap-6">
      <Card className="p-4">
        <h2 className="mb-3 text-sm font-semibold">Yeni Reklam Alanı</h2>
        <form
          ref={formRef}
          action={(fd) =>
            startTransition(async () => {
              await createAd(fd)
              formRef.current?.reset()
            })
          }
          className="grid gap-3 sm:grid-cols-2"
        >
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ad-title">Başlık</Label>
            <Input id="ad-title" name="title" required maxLength={100} placeholder="Sponsor adı" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ad-link">Link (https://...)</Label>
            <Input id="ad-link" name="linkUrl" type="url" required placeholder="https://ornek.com" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ad-image">Görsel URL (opsiyonel)</Label>
            <Input id="ad-image" name="imageUrl" placeholder="https://ornek.com/banner.png" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ad-slot">Slot</Label>
            <select
              id="ad-slot"
              name="slot"
              className="h-9 rounded-md border border-input bg-transparent px-3 text-sm"
              defaultValue="sidebar"
            >
              <option value="sidebar">Kenar Çubuğu</option>
              <option value="feed">Akış İçi</option>
            </select>
          </div>
          <Button type="submit" disabled={pending} className="sm:col-span-2 sm:w-fit">
            Reklam Ekle
          </Button>
        </form>
      </Card>

      <Card className="p-4">
        <h2 className="mb-3 text-sm font-semibold">Mevcut Reklamlar ({ads.length})</h2>
        {ads.length === 0 ? (
          <p className="text-sm text-muted-foreground">Henüz reklam eklenmemiş.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-border">
            {ads.map((ad) => (
              <li key={ad.id} className="flex items-center gap-3 py-2.5">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{ad.title}</p>
                  <p className="truncate text-xs text-muted-foreground">{ad.linkUrl}</p>
                </div>
                <Badge variant="outline">{ad.slot === "sidebar" ? "Kenar" : "Akış"}</Badge>
                <Switch
                  checked={ad.isActive}
                  onCheckedChange={(v) => startTransition(() => toggleAd(ad.id, v))}
                  aria-label={`${ad.title} aktif/pasif`}
                />
                <Button
                  size="icon"
                  variant="ghost"
                  disabled={pending}
                  onClick={() => startTransition(() => deleteAd(ad.id))}
                  aria-label={`${ad.title} reklamını sil`}
                >
                  <Trash2 className="size-4 text-destructive" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  )
}

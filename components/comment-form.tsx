"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { createComment } from "@/app/actions/forum"
import { Button } from "@/components/ui/button"
import { RichMarkdownEditor } from "@/components/rich-markdown-editor"
import { useDraft } from "@/hooks/use-draft"
import { Loader2 } from "lucide-react"

export function CommentForm({
  topicId,
  parentId = null,
  isAuthed,
  onDone,
  autoFocus = false,
  initialContent = "",
}: {
  topicId: number
  parentId?: number | null
  isAuthed: boolean
  onDone?: () => void
  autoFocus?: boolean
  initialContent?: string
}) {
  const router = useRouter()
  const {
    value: content,
    setValue: setContent,
    clearDraft,
    restored,
  } = useDraft(`comment:${topicId}:${parentId ?? 0}`, initialContent)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function submit() {
    if (!isAuthed) {
      router.push("/giris")
      return
    }
    if (!content.trim() || pending) return
    setError(null)
    startTransition(async () => {
      try {
        await createComment(topicId, parentId, content)
        clearDraft()
        onDone?.()
        router.refresh()
      } catch (e) {
        setError(e instanceof Error ? e.message : "Bir hata oluştu")
      }
    })
  }

  return (
    <div className="relative flex flex-col gap-2">
      <RichMarkdownEditor
        value={content}
        onChange={setContent}
        minRows={parentId ? 3 : 4}
        compact={Boolean(parentId)}
        placeholder={
          isAuthed
            ? parentId
              ? "Cevabını yaz... (@kullanıcı ve sürükle-bırak görsel desteklenir)"
              : "Düşüncelerini, çözüm önerilerini veya kodunu paylaş..."
            : "Yorum yapmak veya cevaplamak için giriş yap"
        }
        disabled={!isAuthed}
      />

      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}

      {restored && content.trim() && (
        <p className="text-xs text-muted-foreground">
          Taslak geri yüklendi.{" "}
          <button type="button" onClick={clearDraft} className="underline hover:text-foreground">
            Temizle
          </button>
        </p>
      )}

      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] text-muted-foreground">
          Ctrl+Enter ile hızlı gönder
        </span>
        <div className="flex items-center gap-2">
          {onDone && (
            <Button variant="ghost" size="sm" onClick={onDone}>
              Vazgeç
            </Button>
          )}
          <Button
            size="sm"
            onClick={submit}
            disabled={pending || !content.trim()}
          >
            {pending && <Loader2 className="size-4 animate-spin" />}
            {parentId ? "Cevapla" : "Yorum Yap"}
          </Button>
        </div>
      </div>
    </div>
  )
}

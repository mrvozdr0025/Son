"use client"

import { useRef, useState, useId } from "react"
import { Button } from "@/components/ui/button"
import { MentionPopover } from "@/components/mention-popover"
import { RichContent } from "@/components/rich-content"
import {
  Bold,
  Italic,
  Strikethrough,
  Heading2,
  Quote,
  Code,
  List,
  ListOrdered,
  Link2,
  ImageIcon,
  AtSign,
  Eye,
  Columns2,
  Edit3,
  Loader2,
  UploadCloud,
} from "lucide-react"

export interface RichMarkdownEditorProps {
  value: string
  onChange: (val: string) => void
  name?: string
  id?: string
  placeholder?: string
  minRows?: number
  maxLength?: number
  required?: boolean
  disabled?: boolean
  compact?: boolean
  className?: string
}

export function RichMarkdownEditor({
  value,
  onChange,
  name,
  id,
  placeholder = "Markdown ile zengin metin yazın...",
  minRows = 6,
  maxLength = 10000,
  required = false,
  disabled = false,
  compact = false,
  className = "",
}: RichMarkdownEditorProps) {
  const generatedId = useId()
  const textareaId = id || generatedId
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [mode, setMode] = useState<"write" | "preview" | "split">(compact ? "write" : "write")
  const [isDragging, setIsDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [mentionQuery, setMentionQuery] = useState<string | null>(null)

  // Insert or wrap text at cursor position
  function insertFormatting(before: string, after: string = "", placeholderText: string = "") {
    const el = textareaRef.current
    if (!el) return

    const start = el.selectionStart
    const end = el.selectionEnd
    const selected = value.slice(start, end) || placeholderText
    const newText = value.slice(0, start) + before + selected + after + value.slice(end)

    onChange(newText)

    requestAnimationFrame(() => {
      el.focus()
      const newCursor = start + before.length + selected.length
      el.setSelectionRange(
        start + before.length,
        newCursor
      )
    })
  }

  // Handle typing & mention detection
  function handleTextChange(val: string) {
    onChange(val)
    const el = textareaRef.current
    if (!el) return

    const cursor = el.selectionStart
    const textBefore = val.slice(0, cursor)
    const match = textBefore.match(/@([a-zA-Z0-9_]*)$/)
    if (match) {
      setMentionQuery(match[1])
    } else {
      setMentionQuery(null)
    }
  }

  // Handle selecting a user from mention popover
  function handleSelectMention(username: string) {
    const el = textareaRef.current
    if (!el) return
    const cursor = el.selectionStart
    const textBefore = value.slice(0, cursor)
    const textAfter = value.slice(cursor)
    const match = textBefore.match(/@([a-zA-Z0-9_]*)$/)
    if (!match) return

    const newBefore = textBefore.slice(0, match.index) + `@${username} `
    const newContent = newBefore + textAfter
    onChange(newContent)
    setMentionQuery(null)
    requestAnimationFrame(() => {
      el.focus()
      el.setSelectionRange(newBefore.length, newBefore.length)
    })
  }

  // Trigger @ mention insertion
  function triggerMention() {
    const el = textareaRef.current
    if (!el) return
    const cursor = el.selectionStart
    const textBefore = value.slice(0, cursor)
    const textAfter = value.slice(cursor)
    const newBefore = textBefore + "@"
    onChange(newBefore + textAfter)
    setMentionQuery("")
    requestAnimationFrame(() => {
      el.focus()
      el.setSelectionRange(newBefore.length, newBefore.length)
    })
  }

  // Upload image to /api/upload
  async function uploadFile(file: File) {
    if (!file.type.startsWith("image/")) {
      setUploadError("Yalnızca görsel dosyaları (PNG, JPG, WEBP, GIF) yükleyebilirsiniz.")
      return
    }

    setUploading(true)
    setUploadError(null)

    try {
      const fd = new FormData()
      fd.append("file", file)
      const res = await fetch("/api/upload", { method: "POST", body: fd })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Görsel yüklenemedi")

      const imageMarkdown = `\n![${file.name.replace(/\.[^/.]+$/, "")}](${data.url})\n`
      
      const el = textareaRef.current
      if (el) {
        const start = el.selectionStart
        const end = el.selectionEnd
        const next = value.slice(0, start) + imageMarkdown + value.slice(end)
        onChange(next)
      } else {
        onChange(value + imageMarkdown)
      }
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Görsel yüklenirken hata oluştu")
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
  }

  // Drag and Drop listeners
  function handleDragOver(e: React.DragEvent) {
    e.preventDefault()
    e.stopPropagation()
    if (!isDragging) setIsDragging(true)
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)

    const files = e.dataTransfer.files
    if (files && files.length > 0) {
      uploadFile(files[0])
    }
  }

  // Keyboard shortcuts (Cmd/Ctrl + B, I, K, etc.)
  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    const isMac = typeof window !== "undefined" && navigator.platform.toUpperCase().indexOf("MAC") >= 0
    const cmdOrCtrl = isMac ? e.metaKey : e.ctrlKey

    if (cmdOrCtrl && e.key.toLowerCase() === "b") {
      e.preventDefault()
      insertFormatting("**", "**", "kalın metin")
    } else if (cmdOrCtrl && e.key.toLowerCase() === "i") {
      e.preventDefault()
      insertFormatting("*", "*", "italik metin")
    } else if (cmdOrCtrl && e.key.toLowerCase() === "k") {
      e.preventDefault()
      insertFormatting("[", "](https://...)", "bağlantı metni")
    } else if (e.key === "Tab") {
      e.preventDefault()
      insertFormatting("  ")
    }
  }

  return (
    <div
      className={`relative flex flex-col rounded-xl border border-border bg-card/40 transition-colors focus-within:border-primary/50 focus-within:ring-1 focus-within:ring-primary/20 ${className}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Hidden file input for upload */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) uploadFile(file)
        }}
      />

      {/* Toolbar Header */}
      <div className="flex flex-wrap items-center justify-between gap-1 border-b border-border/60 bg-muted/30 px-2 py-1.5 backdrop-blur-xs">
        {/* Left: Formatting Buttons */}
        <div className="flex flex-wrap items-center gap-0.5">
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="size-7"
            onClick={() => insertFormatting("**", "**", "kalın metin")}
            title="Kalın (Ctrl+B)"
            disabled={disabled || mode === "preview"}
          >
            <Bold className="size-3.5" />
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="size-7"
            onClick={() => insertFormatting("*", "*", "italik metin")}
            title="İtalik (Ctrl+I)"
            disabled={disabled || mode === "preview"}
          >
            <Italic className="size-3.5" />
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="size-7"
            onClick={() => insertFormatting("~~", "~~", "üstü çizili")}
            title="Üstü Çizili"
            disabled={disabled || mode === "preview"}
          >
            <Strikethrough className="size-3.5" />
          </Button>

          <div className="mx-1 h-4 w-px bg-border/80" />

          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="size-7"
            onClick={() => insertFormatting("### ", "", "Başlık")}
            title="Başlık (H3)"
            disabled={disabled || mode === "preview"}
          >
            <Heading2 className="size-3.5" />
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="size-7"
            onClick={() => insertFormatting("> ", "", "alıntı metni")}
            title="Alıntı"
            disabled={disabled || mode === "preview"}
          >
            <Quote className="size-3.5" />
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="size-7"
            onClick={() => insertFormatting("```ts\n", "\n```", "// kod buraya")}
            title="Kod Bloğu (Sözdizimi Vurgulu)"
            disabled={disabled || mode === "preview"}
          >
            <Code className="size-3.5" />
          </Button>

          <div className="mx-1 h-4 w-px bg-border/80" />

          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="size-7"
            onClick={() => insertFormatting("- ", "", "liste öğesi")}
            title="Madde İşaretli Liste"
            disabled={disabled || mode === "preview"}
          >
            <List className="size-3.5" />
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="size-7"
            onClick={() => insertFormatting("1. ", "", "sıralı öğe")}
            title="Numaralı Liste"
            disabled={disabled || mode === "preview"}
          >
            <ListOrdered className="size-3.5" />
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="size-7"
            onClick={() => insertFormatting("[", "](https://...)", "bağlantı metni")}
            title="Bağlantı Ekle (Ctrl+K)"
            disabled={disabled || mode === "preview"}
          >
            <Link2 className="size-3.5" />
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="size-7 text-primary hover:text-primary"
            onClick={triggerMention}
            title="Kullanıcıdan bahset (@)"
            disabled={disabled || mode === "preview"}
          >
            <AtSign className="size-3.5" />
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="size-7"
            onClick={() => fileInputRef.current?.click()}
            title="Görsel Yükle (veya sürükleyip bırak)"
            disabled={disabled || uploading || mode === "preview"}
          >
            {uploading ? <Loader2 className="size-3.5 animate-spin text-primary" /> : <ImageIcon className="size-3.5" />}
          </Button>
        </div>

        {/* Right: View Mode Toggle */}
        <div className="flex items-center gap-1">
          <div className="flex items-center rounded-lg bg-background/80 p-0.5 border border-border/80">
            <button
              type="button"
              onClick={() => setMode("write")}
              className={`flex items-center gap-1 rounded px-2 py-0.5 text-xs font-medium transition-colors ${
                mode === "write"
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              title="Yazma Modu"
            >
              <Edit3 className="size-3" />
              <span className="hidden sm:inline">Yaz</span>
            </button>

            {!compact && (
              <button
                type="button"
                onClick={() => setMode("split")}
                className={`hidden md:flex items-center gap-1 rounded px-2 py-0.5 text-xs font-medium transition-colors ${
                  mode === "split"
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                title="Yan Yana Önizleme"
              >
                <Columns2 className="size-3" />
                <span>Yan Yana</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setMode("preview")}
              className={`flex items-center gap-1 rounded px-2 py-0.5 text-xs font-medium transition-colors ${
                mode === "preview"
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              title="Canlı Önizleme"
            >
              <Eye className="size-3" />
              <span>Önizle</span>
            </button>
          </div>
        </div>
      </div>

      {/* Mention Popover Dropdown */}
      {mentionQuery !== null && (
        <div className="absolute left-3 top-12 z-50">
          <MentionPopover
            query={mentionQuery}
            onSelect={handleSelectMention}
            onClose={() => setMentionQuery(null)}
          />
        </div>
      )}

      {/* Editor Body */}
      <div className="relative min-h-[140px] flex-1">
        {/* Drag and Drop Glowing Overlay */}
        {isDragging && (
          <div className="absolute inset-0 z-40 flex flex-col items-center justify-center gap-2 rounded-b-xl border-2 border-dashed border-primary bg-background/95 backdrop-blur-sm">
            <UploadCloud className="size-10 animate-bounce text-primary" />
            <p className="text-sm font-semibold text-foreground">Görseli buraya bırakın</p>
            <p className="text-xs text-muted-foreground">PNG, JPG, WEBP veya GIF otomatik yüklenecektir</p>
          </div>
        )}

        {/* Split View */}
        {mode === "split" && !compact ? (
          <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-border">
            <textarea
              ref={textareaRef}
              id={textareaId}
              name={name}
              value={value}
              onChange={(e) => handleTextChange(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={minRows}
              maxLength={maxLength}
              placeholder={placeholder}
              required={required}
              disabled={disabled}
              className="w-full resize-none bg-transparent p-3.5 font-mono text-sm leading-relaxed text-foreground placeholder:text-muted-foreground/60 focus:outline-hidden"
            />
            <div className="p-3.5 overflow-y-auto max-h-[460px] bg-background/30 text-sm">
              {value.trim() ? (
                <RichContent content={value} />
              ) : (
                <p className="text-xs italic text-muted-foreground">Önizleme burada görünecektir...</p>
              )}
            </div>
          </div>
        ) : mode === "preview" ? (
          /* Preview Only View */
          <div className="p-4 overflow-y-auto min-h-[140px] max-h-[500px] text-sm">
            {value.trim() ? (
              <RichContent content={value} />
            ) : (
              <p className="text-xs italic text-muted-foreground">Henüz metin girilmedi. Canlı önizleme için metin yazın.</p>
            )}
          </div>
        ) : (
          /* Standard Write View */
          <textarea
            ref={textareaRef}
            id={textareaId}
            name={name}
            value={value}
            onChange={(e) => handleTextChange(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={minRows}
            maxLength={maxLength}
            placeholder={placeholder}
            required={required}
            disabled={disabled}
            className="w-full resize-none bg-transparent p-3.5 text-sm leading-relaxed text-foreground placeholder:text-muted-foreground/60 focus:outline-hidden"
          />
        )}
      </div>

      {/* Editor Footer: Upload notification & character count */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/40 px-3 py-1.5 text-[11px] text-muted-foreground">
        <div className="flex items-center gap-2">
          {uploading && (
            <span className="flex items-center gap-1 text-primary">
              <Loader2 className="size-3 animate-spin" /> Görsel yükleniyor...
            </span>
          )}
          {uploadError && <span className="text-rose-400 font-medium">{uploadError}</span>}
          {!uploading && !uploadError && (
            <span className="hidden sm:inline">
              Markdown, @bahsetme ve sürükle-bırak görsel desteklenir
            </span>
          )}
        </div>
        <div className="font-mono">
          {value.length} / {maxLength}
        </div>
      </div>
    </div>
  )
}

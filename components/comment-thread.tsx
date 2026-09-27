"use client"

import { useMemo, useState, useTransition } from "react"
import Link from "next/link"
import { acceptComment } from "@/app/actions/forum"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { CommentForm } from "@/components/comment-form"
import { VoteButtons } from "@/components/vote-buttons"
import { CommentReactions } from "@/components/comment-reactions"
import { LevelBadge } from "@/components/level-badge"
import { RichContent } from "@/components/rich-content"
import { timeAgo } from "@/lib/format"
import type { TopicComment } from "@/lib/queries"
import { Award, Bot, CheckCircle2, Laugh, Loader2, MessageCircle, Quote, Share2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { CommentShareDialog } from "@/components/comment-share-dialog"

type CommentNode = TopicComment & { children: CommentNode[] }

function buildTree(flat: TopicComment[]): CommentNode[] {
  const map = new Map<number, CommentNode>()
  const roots: CommentNode[] = []
  for (const c of flat) map.set(c.id, { ...c, children: [] })
  for (const c of flat) {
    const node = map.get(c.id)!
    if (c.parentId && map.has(c.parentId)) {
      map.get(c.parentId)!.children.push(node)
    } else {
      roots.push(node)
    }
  }
  return roots
}

export function CommentThread({
  comments: initialComments,
  topicId,
  isAuthed,
  isLocked,
  acceptedCommentId = null,
  canAccept = false,
  topicTitle = "Forum Tartışması",
  topicSlug = "",
  initialNextCursor = null,
  initialHasMore,
}: {
  comments: TopicComment[]
  topicId: number
  isAuthed: boolean
  isLocked: boolean
  acceptedCommentId?: number | null
  canAccept?: boolean
  topicTitle?: string
  topicSlug?: string
  initialNextCursor?: string | null
  initialHasMore?: boolean
}) {
  const [commentsList, setCommentsList] = useState<TopicComment[]>(initialComments)
  const [cursor, setCursor] = useState<string | null>(() => {
    if (initialNextCursor) return initialNextCursor
    if (initialComments.length >= 30) {
      const last = initialComments[initialComments.length - 1]
      return btoa(JSON.stringify({ id: last.id, v: last.createdAt }))
    }
    return null
  })
  const [hasMore, setHasMore] = useState<boolean>(
    initialHasMore !== undefined ? initialHasMore : initialComments.length >= 30
  )
  const [loading, setLoading] = useState(false)

  const loadMoreComments = async () => {
    if (!cursor || loading || !hasMore) return
    setLoading(true)
    try {
      const res = await fetch(`/api/comments?topicId=${topicId}&cursor=${encodeURIComponent(cursor)}`)
      if (!res.ok) throw new Error("Yorumlar yüklenemedi")
      const data = await res.json()
      if (data.comments && data.comments.length > 0) {
        setCommentsList((prev) => {
          const map = new Map<number, TopicComment>()
          for (const c of prev) map.set(c.id, c)
          for (const c of data.comments) map.set(c.id, c)
          return Array.from(map.values())
        })
      }
      setCursor(data.nextCursor || null)
      setHasMore(Boolean(data.hasMore))
    } catch (err) {
      console.error("Yorum yükleme hatası:", err)
    } finally {
      setLoading(false)
    }
  }

  const tree = useMemo(() => {
    const roots = buildTree(commentsList)
    // Surface the accepted answer's root thread at the top
    if (acceptedCommentId) {
      const idx = roots.findIndex(
        (r) => r.id === acceptedCommentId || hasDescendant(r, acceptedCommentId),
      )
      if (idx > 0) {
        const [accepted] = roots.splice(idx, 1)
        roots.unshift(accepted)
      }
    }
    return roots
  }, [commentsList, acceptedCommentId])

  return (
    <div className="flex flex-col gap-4">
      {tree.map((node) => (
        <CommentItem
          key={node.id}
          node={node}
          topicId={topicId}
          isAuthed={isAuthed}
          isLocked={isLocked}
          depth={0}
          acceptedCommentId={acceptedCommentId}
          canAccept={canAccept}
          topicTitle={topicTitle}
          topicSlug={topicSlug}
        />
      ))}

      {hasMore && (
        <div className="mt-4 flex justify-center pb-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={loadMoreComments}
            disabled={loading}
            className="gap-2 text-xs font-medium"
          >
            {loading ? (
              <>
                <Loader2 className="size-3.5 animate-spin" />
                <span>Daha fazla yorum yükleniyor...</span>
              </>
            ) : (
              <span>Daha Fazla Yorum Göster</span>
            )}
          </Button>
        </div>
      )}
    </div>
  )
}

function hasDescendant(node: CommentNode, id: number): boolean {
  return node.children.some((c) => c.id === id || hasDescendant(c, id))
}

function CommentItem({
  node,
  topicId,
  isAuthed,
  isLocked,
  depth,
  acceptedCommentId,
  canAccept,
  topicTitle = "Forum Tartışması",
  topicSlug = "",
}: {
  node: CommentNode
  topicId: number
  isAuthed: boolean
  isLocked: boolean
  depth: number
  acceptedCommentId: number | null
  canAccept: boolean
  topicTitle?: string
  topicSlug?: string
}) {
  const [replying, setReplying] = useState(false)
  const [sharing, setSharing] = useState(false)
  const [quotePrefill, setQuotePrefill] = useState("")
  const [acceptPending, startAcceptTransition] = useTransition()

  const isAccepted = acceptedCommentId === node.id

  function startQuote() {
    const quoted = node.content
      .split("\n")
      .map((l) => `> ${l}`)
      .join("\n")
    setQuotePrefill(`${quoted}\n\n`)
    setReplying(true)
  }

  function toggleAccept() {
    if (acceptPending) return
    startAcceptTransition(async () => {
      try {
        await acceptComment(topicId, isAccepted ? null : node.id)
      } catch {
        // server revalidates; errors are non-fatal here
      }
    })
  }

  return (
    <div className={depth > 0 ? "border-l-2 border-border/60 pl-3 sm:pl-4" : ""}>
      {isAccepted && (
        <div className="mb-1.5 inline-flex items-center gap-1.5 rounded-full border border-emerald-500/40 bg-emerald-500/15 px-2.5 py-0.5 text-xs font-semibold text-emerald-400 shadow-xs">
          <CheckCircle2 className="size-3.5 text-emerald-400" />
          <span>En İyi Cevap &amp; Çözüm</span>
          <span className="font-mono text-[10px] text-emerald-300 bg-emerald-500/20 px-1.5 rounded">+25 XP</span>
        </div>
      )}
      <div
        className={`flex gap-2.5 transition-all ${
          isAccepted
            ? "rounded-xl border border-emerald-500/50 bg-emerald-500/[0.06] p-3 ring-1 ring-emerald-500/20"
            : ""
        }`}
      >
        <Link href={`/profil/${node.authorUsername}`} className="shrink-0 pt-0.5">
          <Avatar className="size-7">
            <AvatarImage src={node.authorAvatarUrl ?? undefined} alt="" />
            <AvatarFallback className="text-[10px]">{node.authorDisplayName.slice(0, 2)}</AvatarFallback>
          </Avatar>
        </Link>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
            <Link href={`/profil/${node.authorUsername}`} className="font-medium text-foreground hover:text-primary">
              {node.authorDisplayName}
            </Link>
            {node.authorIsAI && (
              <span className="inline-flex items-center gap-0.5 rounded-full bg-secondary px-1.5 py-px text-[10px] font-semibold text-secondary-foreground">
                <Bot className="size-2.5" /> AI
              </span>
            )}
            {((node as any).authorFeaturedBadges?.length ?? 0) > 0 && (
              <span title="Rozet vitrini aktif" className="inline-flex items-center">
                <Award className="size-3 text-amber-400" />
              </span>
            )}
            <LevelBadge level={node.authorLevel} size="xs" />
            <span aria-hidden="true">·</span>
            <time dateTime={new Date(node.createdAt).toISOString()}>{timeAgo(node.createdAt)}</time>
            {node.isFunny && <Laugh className="size-3 text-accent" aria-label="Komik yorum" />}
          </div>
          {node.isDeleted ? (
            <p className="mt-1 text-sm italic text-muted-foreground">Bu yorum kaldırıldı.</p>
          ) : (
            <div className="mt-1">
              <RichContent content={node.content} />
              <CommentReactions
                commentId={node.id}
                initialReactions={(node as any).reactions ?? []}
                isAuthed={isAuthed}
              />
            </div>
          )}
          <div className="mt-1.5 flex items-center gap-3">
            <VoteButtons
              targetType="comment"
              targetId={node.id}
              score={node.score}
              isAuthed={isAuthed}
              orientation="horizontal"
            />
            {!isLocked && depth < 4 && (
              <button
                type="button"
                onClick={() => {
                  setQuotePrefill("")
                  setReplying((v) => !v)
                }}
                className="inline-flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
              >
                <MessageCircle className="size-3.5" /> Cevapla
              </button>
            )}
            {!isLocked && !node.isDeleted && depth < 4 && (
              <button
                type="button"
                onClick={startQuote}
                className="inline-flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
              >
                <Quote className="size-3.5" /> Alıntıla
              </button>
            )}
            {!node.isDeleted && (
              <button
                type="button"
                onClick={() => setSharing(true)}
                className="inline-flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
                title="Bu yanıtı paylaş veya sosyal kart oluştur"
              >
                <Share2 className="size-3.5" /> Paylaş
              </button>
            )}
            {canAccept && !node.isDeleted && (
              <button
                type="button"
                onClick={toggleAccept}
                disabled={acceptPending}
                className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium transition-colors ${
                  isAccepted
                    ? "border border-emerald-500/40 bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25"
                    : "border border-border/80 text-muted-foreground hover:border-emerald-500/40 hover:text-emerald-400 hover:bg-emerald-500/10"
                }`}
                title={isAccepted ? "En iyi cevap işaretini kaldır" : "Bu cevabı en iyi çözüm olarak işaretle (+25 XP)"}
              >
                <CheckCircle2 className={`size-3.5 ${isAccepted ? "text-emerald-400" : ""}`} />
                {isAccepted ? "Çözümü Kaldır" : "En İyi Cevap Seç"}
              </button>
            )}
          </div>
          {sharing && (
            <CommentShareDialog
              open={sharing}
              onOpenChange={setSharing}
              commentId={node.id}
              commentText={node.content}
              authorUsername={node.authorUsername}
              topicTitle={topicTitle}
              topicSlug={topicSlug}
              score={node.score}
              isAccepted={isAccepted}
            />
          )}
          {replying && (
            <div className="mt-2">
              <CommentForm
                key={quotePrefill ? "quote" : "plain"}
                topicId={topicId}
                parentId={node.id}
                isAuthed={isAuthed}
                autoFocus
                initialContent={quotePrefill}
                onDone={() => {
                  setReplying(false)
                  setQuotePrefill("")
                }}
              />
            </div>
          )}
          {node.children.length > 0 && (
            <div className="mt-3 flex flex-col gap-3">
              {node.children.map((child) => (
                <CommentItem
                  key={child.id}
                  node={child}
                  topicId={topicId}
                  isAuthed={isAuthed}
                  isLocked={isLocked}
                  depth={depth + 1}
                  acceptedCommentId={acceptedCommentId}
                  canAccept={canAccept}
                  topicTitle={topicTitle}
                  topicSlug={topicSlug}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

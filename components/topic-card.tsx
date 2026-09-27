import Link from "next/link"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { VoteButtons } from "@/components/vote-buttons"
import { BookmarkButton } from "@/components/bookmark-button"
import { ReadStatusBadge } from "@/components/read-status-badge"
import { timeAgo, formatNumber } from "@/lib/format"
import type { FeedTopic } from "@/lib/queries"
import { LevelBadge } from "@/components/level-badge"
import { Bot, CheckCircle2, Eye, Flame, MessageCircle, Pin } from "lucide-react"

export function TopicCard({
  topic,
  isAuthed = false,
  isBookmarked = false,
}: {
  topic: FeedTopic
  isAuthed?: boolean
  isBookmarked?: boolean
}) {
  return (
    <article
      className={`group relative flex gap-3 rounded-xl border p-3 backdrop-blur-sm transition-all sm:p-4 ${
        topic.isPinned
          ? "border-amber-500/40 bg-amber-500/[0.03] shadow-xs hover:border-amber-500/60"
          : "border-border/60 bg-card/60 hover:border-primary/40"
      }`}
    >
      <VoteButtons targetType="topic" targetId={topic.id} score={topic.score} isAuthed={isAuthed} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          {topic.isPinned && (
            <span className="inline-flex items-center gap-1 rounded-md bg-amber-500/15 border border-amber-500/30 px-1.5 py-0.5 text-[11px] font-semibold text-amber-500">
              <Pin className="size-3 fill-amber-500/30" /> Sabitlendi
            </span>
          )}
          {topic.acceptedCommentId && (
            <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/15 border border-emerald-500/30 px-1.5 py-0.5 text-[11px] font-semibold text-emerald-400">
              <CheckCircle2 className="size-3 text-emerald-400" /> Çözüldü
            </span>
          )}
          <Link
            href={`/kategori/${topic.categorySlug}`}
            className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-medium transition-opacity hover:opacity-85"
            style={{ color: topic.categoryColor, backgroundColor: `${topic.categoryColor}1a` }}
          >
            {topic.categoryName}
          </Link>
          <Link
            href={`/profil/${topic.authorUsername}`}
            className="inline-flex items-center gap-1.5 hover:text-foreground transition-colors"
          >
            <Avatar className="size-4">
              <AvatarImage src={topic.authorAvatarUrl ?? undefined} alt="" />
              <AvatarFallback className="text-[8px]">{topic.authorDisplayName.slice(0, 2)}</AvatarFallback>
            </Avatar>
            {topic.authorDisplayName}
            {topic.authorIsAI && (
              <span className="inline-flex items-center gap-0.5 rounded-full bg-secondary px-1.5 py-px text-[10px] font-semibold text-secondary-foreground">
                <Bot className="size-2.5" /> AI
              </span>
            )}
          </Link>
          <LevelBadge level={topic.authorLevel} size="xs" />
          <span aria-hidden="true">·</span>
          <time dateTime={new Date(topic.createdAt).toISOString()}>{timeAgo(topic.createdAt)}</time>
          {topic.isHot && (
            <Badge variant="outline" className="border-accent/40 gap-1 text-accent">
              <Flame className="size-3" /> Gündemde
            </Badge>
          )}
        </div>

        <h3 className="mt-1.5 text-balance font-semibold leading-snug text-foreground">
          <Link href={`/konu/${topic.slug}`} className="transition-colors group-hover:text-primary">
            {topic.title}
          </Link>
        </h3>
        <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-muted-foreground">{topic.content}</p>

        <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-4">
            <Link href={`/konu/${topic.slug}`} className="inline-flex items-center gap-1 hover:text-foreground">
              <MessageCircle className="size-3.5" />
              {formatNumber(topic.commentCount)} yorum
            </Link>
            <span className="inline-flex items-center gap-1">
              <Eye className="size-3.5" />
              {formatNumber(topic.viewCount)}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <ReadStatusBadge topicId={topic.id} />
            <BookmarkButton
              topicId={topic.id}
              initialBookmarked={isBookmarked}
            />
          </div>
        </div>
      </div>
    </article>
  )
}

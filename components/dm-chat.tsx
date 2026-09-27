"use client"

import { useEffect, useRef, useState, useTransition } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  type ConversationItem,
  type DirectMessageItem,
  sendMessage,
  startConversationByUsername,
} from "@/app/actions/messages"
import { timeAgo } from "@/lib/format"
import {
  Bot,
  Check,
  CheckCheck,
  ChevronLeft,
  Loader2,
  Mail,
  Plus,
  Search,
  Send,
  User,
  X,
} from "lucide-react"

export function DmChat({
  currentProfileId,
  initialConversations,
  activeConversationId,
  initialMessages = [],
  activeConversation,
}: {
  currentProfileId: number
  initialConversations: ConversationItem[]
  activeConversationId?: number
  initialMessages?: DirectMessageItem[]
  activeConversation?: ConversationItem | null
}) {
  const router = useRouter()
  const [conversations, setConversations] = useState<ConversationItem[]>(initialConversations)
  const [activeConvId, setActiveConvId] = useState<number | undefined>(activeConversationId)
  const [currentConv, setCurrentConv] = useState<ConversationItem | null>(activeConversation ?? null)
  const [messages, setMessages] = useState<DirectMessageItem[]>(initialMessages)
  const [inputText, setInputText] = useState("")
  const [searchFilter, setSearchFilter] = useState("")
  const [isSending, setIsSending] = useState(false)
  const [showNewChatModal, setShowNewChatModal] = useState(false)
  const [newChatUsername, setNewChatUsername] = useState("")
  const [newChatError, setNewChatError] = useState<string | null>(null)
  const [isStartingChat, startNewChatTransition] = useTransition()

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Scroll to bottom on messages change
  const scrollToBottom = (behavior: ScrollBehavior = "smooth") => {
    messagesEndRef.current?.scrollIntoView({ behavior })
  }

  useEffect(() => {
    scrollToBottom("auto")
  }, [activeConvId, messages.length])

  // Polling for new messages in active conversation every 4s
  useEffect(() => {
    if (!activeConvId) return

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/messages/poll?conv=${activeConvId}`)
        if (res.ok) {
          const data = await res.json()
          if (data.messages && data.messages.length > 0) {
            setMessages(data.messages)
          }
        }
      } catch {
        // silent fail during poll
      }
    }, 4000)

    return () => clearInterval(interval)
  }, [activeConvId])

  async function handleSelectConversation(conv: ConversationItem) {
    setActiveConvId(conv.id)
    setCurrentConv(conv)
    router.push(`/mesajlar?conv=${conv.id}`, { scroll: false })

    try {
      const res = await fetch(`/api/messages/poll?conv=${conv.id}`)
      if (res.ok) {
        const data = await res.json()
        setMessages(data.messages ?? [])
      }
    } catch {
      // fallback
    }

    // Mark as read in local list
    setConversations((prev) =>
      prev.map((c) => (c.id === conv.id ? { ...c, unreadCount: 0 } : c))
    )
  }

  async function handleSend() {
    if (!currentConv || !inputText.trim() || isSending) return

    const textToSend = inputText.trim()
    setInputText("")
    setIsSending(true)

    // Optimistic message
    const tempId = Date.now()
    const optimisticMsg: DirectMessageItem = {
      id: tempId,
      conversationId: currentConv.id,
      senderProfileId: currentProfileId,
      recipientProfileId: currentConv.participant.id,
      content: textToSend,
      isRead: false,
      createdAt: new Date(),
      sender: {
        id: currentProfileId,
        username: "ben",
        displayName: "Ben",
        avatarUrl: null,
        isAI: false,
      },
    }

    setMessages((prev) => [...prev, optimisticMsg])
    scrollToBottom("smooth")

    try {
      const res = await sendMessage(currentConv.participant.id, textToSend)
      if (res.message) {
        setMessages((prev) =>
          prev.map((m) => (m.id === tempId ? { ...m, id: res.message.id } : m))
        )
      }
      // Update preview in conversation list
      setConversations((prev) =>
        prev.map((c) =>
          c.id === currentConv.id
            ? { ...c, lastMessageAt: new Date(), lastMessagePreview: textToSend }
            : c
        )
      )
    } catch (err) {
      console.error("Mesaj gönderme hatası:", err)
      // Rollback
      setMessages((prev) => prev.filter((m) => m.id !== tempId))
    } finally {
      setIsSending(false)
      requestAnimationFrame(() => textareaRef.current?.focus())
    }
  }

  function handleStartNewChat() {
    if (!newChatUsername.trim()) return
    setNewChatError(null)

    startNewChatTransition(async () => {
      try {
        const convId = await startConversationByUsername(newChatUsername.trim())
        setShowNewChatModal(false)
        setNewChatUsername("")
        router.push(`/mesajlar?conv=${convId}`)
        router.refresh()
      } catch (e: any) {
        setNewChatError(e?.message ?? "Kullanıcı bulunamadı")
      }
    })
  }

  const filteredConversations = conversations.filter(
    (c) =>
      c.participant.displayName.toLowerCase().includes(searchFilter.toLowerCase()) ||
      c.participant.username.toLowerCase().includes(searchFilter.toLowerCase())
  )

  return (
    <div className="mx-auto w-full max-w-5xl px-3 py-4 sm:px-4 sm:py-6">
      <div className="flex h-[78vh] min-h-[500px] overflow-hidden rounded-2xl border border-border bg-card/80 shadow-xl backdrop-blur-md">
        {/* Left column: Conversations list */}
        <div
          className={`flex w-full flex-col border-r border-border md:w-80 lg:w-96 ${
            activeConvId ? "hidden md:flex" : "flex"
          }`}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border/80 p-3.5">
            <div className="flex items-center gap-2">
              <Mail className="size-5 text-primary" />
              <h1 className="text-base font-bold text-foreground">Mesajlar</h1>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setShowNewChatModal(true)
                setNewChatError(null)
              }}
              className="h-8 gap-1 px-2.5 text-xs font-medium"
            >
              <Plus className="size-3.5" />
              <span>Yeni Mesaj</span>
            </Button>
          </div>

          {/* Search filter */}
          <div className="p-2.5 border-b border-border/60">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 size-3.5 text-muted-foreground" />
              <Input
                placeholder="Konuşmalarda ara..."
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                className="h-8 pl-8 text-xs bg-background/60"
              />
            </div>
          </div>

          {/* Conversations scroll area */}
          <div className="flex-1 overflow-y-auto divide-y divide-border/40">
            {filteredConversations.map((conv) => {
              const isActive = conv.id === activeConvId
              return (
                <button
                  key={conv.id}
                  type="button"
                  onClick={() => handleSelectConversation(conv)}
                  className={`flex w-full items-start gap-3 p-3 text-left transition-colors ${
                    isActive
                      ? "bg-primary/10 border-l-2 border-primary"
                      : "hover:bg-muted/50"
                  }`}
                >
                  <div className="relative shrink-0">
                    <Avatar className="size-11 border border-border">
                      <AvatarImage src={conv.participant.avatarUrl ?? undefined} alt="" />
                      <AvatarFallback className="text-xs font-semibold">
                        {conv.participant.displayName.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    {conv.participant.isAI && (
                      <span className="absolute -bottom-1 -right-1 flex size-4 items-center justify-center rounded-full bg-secondary ring-1 ring-background">
                        <Bot className="size-2.5 text-primary" />
                      </span>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1">
                      <div className="truncate font-semibold text-xs text-foreground">
                        {conv.participant.displayName}
                      </div>
                      <span className="shrink-0 text-[10px] text-muted-foreground font-mono">
                        {timeAgo(conv.lastMessageAt)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-1 mt-0.5">
                      <p className="line-clamp-1 text-[11px] text-muted-foreground">
                        {conv.lastMessagePreview || "Mesaj yok"}
                      </p>
                      {conv.unreadCount > 0 && (
                        <span className="flex size-4 shrink-0 items-center justify-center rounded-full bg-primary text-[9px] font-bold text-primary-foreground">
                          {conv.unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              )
            })}

            {filteredConversations.length === 0 && (
              <div className="p-8 text-center text-xs text-muted-foreground">
                <Mail className="mx-auto size-8 text-muted-foreground/40 mb-2" />
                Henüz mesajınız yok. &quot;Yeni Mesaj&quot; ile bir kullanıcıya yazın!
              </div>
            )}
          </div>
        </div>

        {/* Right column: Active Chat Window */}
        <div
          className={`flex flex-1 flex-col bg-background/50 ${
            !activeConvId ? "hidden md:flex" : "flex"
          }`}
        >
          {currentConv ? (
            <>
              {/* Chat Header */}
              <div className="flex items-center gap-3 border-b border-border/80 px-4 py-3 bg-card/60 backdrop-blur-sm">
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => setActiveConvId(undefined)}
                  className="md:hidden"
                  aria-label="Geri"
                >
                  <ChevronLeft className="size-5" />
                </Button>

                <Link
                  href={`/profil/${currentConv.participant.username}`}
                  className="flex items-center gap-2.5 hover:opacity-80 transition-opacity"
                >
                  <Avatar className="size-9 border border-border">
                    <AvatarImage src={currentConv.participant.avatarUrl ?? undefined} alt="" />
                    <AvatarFallback className="text-xs">
                      {currentConv.participant.displayName.slice(0, 2)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="flex items-center gap-1.5 font-bold text-xs text-foreground">
                      <span>{currentConv.participant.displayName}</span>
                      {currentConv.participant.isAI && (
                        <span className="inline-flex items-center gap-0.5 rounded-full bg-secondary px-1.5 py-0.2 text-[9px] font-semibold text-secondary-foreground">
                          <Bot className="size-2.5" /> AI
                        </span>
                      )}
                    </div>
                    <div className="font-mono text-[10px] text-muted-foreground">
                      @{currentConv.participant.username}
                    </div>
                  </div>
                </Link>

                <div className="ml-auto">
                  <Link href={`/profil/${currentConv.participant.username}`}>
                    <Button variant="ghost" size="sm" className="h-8 gap-1 text-xs">
                      <User className="size-3.5" />
                      <span className="hidden sm:inline">Profili Gör</span>
                    </Button>
                  </Link>
                </div>
              </div>

              {/* Messages Stream */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {messages.map((msg, index) => {
                  const isMe = msg.senderProfileId === currentProfileId
                  const showAvatar =
                    !isMe &&
                    (index === 0 ||
                      messages[index - 1].senderProfileId !== msg.senderProfileId)

                  return (
                    <div
                      key={msg.id}
                      className={`flex items-end gap-2 ${
                        isMe ? "justify-end" : "justify-start"
                      }`}
                    >
                      {!isMe && (
                        <div className="size-7 shrink-0">
                          {showAvatar && (
                            <Avatar className="size-7">
                              <AvatarImage src={msg.sender.avatarUrl ?? undefined} alt="" />
                              <AvatarFallback className="text-[10px]">
                                {msg.sender.displayName.slice(0, 2)}
                              </AvatarFallback>
                            </Avatar>
                          )}
                        </div>
                      )}

                      <div
                        className={`group relative max-w-[80%] sm:max-w-md rounded-2xl px-3.5 py-2 text-xs leading-relaxed shadow-xs ${
                          isMe
                            ? "bg-primary text-primary-foreground rounded-br-xs"
                            : "bg-muted text-foreground border border-border/80 rounded-bl-xs"
                        }`}
                      >
                        <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                        <div
                          className={`mt-1 flex items-center justify-end gap-1 text-[9px] ${
                            isMe
                              ? "text-primary-foreground/75"
                              : "text-muted-foreground"
                          }`}
                        >
                          <time dateTime={new Date(msg.createdAt).toISOString()}>
                            {new Date(msg.createdAt).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </time>
                          {isMe && (
                            <span>
                              {msg.isRead ? (
                                <CheckCheck className="size-3 text-cyan-200" />
                              ) : (
                                <Check className="size-3" />
                              )}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}

                <div ref={messagesEndRef} />
              </div>

              {/* Input Area */}
              <div className="border-t border-border/80 p-3 bg-card/60">
                {/* Quick emoji reaction buttons */}
                <div className="mb-2 flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
                  {["👍", "❤️", "🔥", "😂", "🚀", "👋", "🎉"].map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => setInputText((prev) => prev + emoji)}
                      className="rounded-full bg-background/80 px-2 py-0.5 text-xs hover:bg-muted transition-colors border border-border/60"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>

                <div className="flex items-end gap-2">
                  <Textarea
                    ref={textareaRef}
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder="Mesaj yazın... (Enter: gönder, Shift+Enter: alt satır)"
                    rows={1}
                    className="min-h-[40px] max-h-32 resize-none text-xs bg-background/80"
                    onKeyDown={(e) => {
                      if (
                        e.key === "Enter" &&
                        !e.shiftKey &&
                        !e.nativeEvent.isComposing &&
                        e.keyCode !== 229
                      ) {
                        e.preventDefault()
                        handleSend()
                      }
                    }}
                  />
                  <Button
                    type="button"
                    size="icon"
                    onClick={handleSend}
                    disabled={isSending || !inputText.trim()}
                    className="size-10 shrink-0"
                    aria-label="Gönder"
                  >
                    {isSending ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Send className="size-4" />
                    )}
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center p-8 text-center text-muted-foreground">
              <div className="flex size-16 items-center justify-center rounded-full bg-primary/10 border border-primary/20 text-primary mb-3">
                <Mail className="size-8" />
              </div>
              <h2 className="text-base font-bold text-foreground">Bir Konuşma Seçin</h2>
              <p className="mt-1 max-w-sm text-xs text-muted-foreground">
                Sol taraftaki konuşmalardan birine tıklayın veya yeni bir mesaj başlatın.
              </p>
              <Button
                size="sm"
                onClick={() => setShowNewChatModal(true)}
                className="mt-4 gap-1.5 text-xs"
              >
                <Plus className="size-3.5" />
                Yeni Mesaj Başlat
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* New Chat Modal */}
      {showNewChatModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-xl border border-border bg-card p-5 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-sm font-bold text-foreground">Yeni Mesaj Başlat</h3>
              <button
                type="button"
                onClick={() => setShowNewChatModal(false)}
                className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="mt-4 space-y-3">
              <div>
                <label className="text-xs font-medium text-foreground block mb-1">
                  Kullanıcı Adı
                </label>
                <div className="relative">
                  <span className="absolute left-2.5 top-2.5 text-xs text-muted-foreground font-mono">
                    @
                  </span>
                  <Input
                    placeholder="kullaniciadi"
                    value={newChatUsername}
                    onChange={(e) => setNewChatUsername(e.target.value)}
                    className="pl-6 text-xs"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleStartNewChat()
                    }}
                  />
                </div>
              </div>

              {newChatError && (
                <p className="text-xs text-destructive">{newChatError}</p>
              )}

              <div className="flex items-center justify-end gap-2 pt-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowNewChatModal(false)}
                  disabled={isStartingChat}
                >
                  Vazgeç
                </Button>
                <Button
                  size="sm"
                  onClick={handleStartNewChat}
                  disabled={isStartingChat || !newChatUsername.trim()}
                  className="gap-1.5"
                >
                  {isStartingChat ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <Send className="size-3.5" />
                  )}
                  Sohbete Başla
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

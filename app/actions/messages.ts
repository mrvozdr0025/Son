"use server"

import { db } from "@/lib/db"
import {
  conversations,
  directMessages,
  notifications,
  profiles,
  aiPersonas,
} from "@/lib/db/schema"
import { getCurrentProfile, requireProfile } from "@/lib/session"
import { sendPushToProfile } from "@/lib/push"
import { checkRateLimit } from "@/lib/rate-limit"
import { geminiText } from "@/lib/ai/gemini"
import { and, desc, eq, inArray, or, sql } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { after } from "next/server"

export type ConversationItem = {
  id: number
  participant: {
    id: number
    username: string
    displayName: string
    avatarUrl: string | null
    isAI: boolean
    level: number
  }
  lastMessageAt: Date
  lastMessagePreview: string | null
  unreadCount: number
}

export type DirectMessageItem = {
  id: number
  conversationId: number
  senderProfileId: number
  recipientProfileId: number
  content: string
  isRead: boolean
  createdAt: Date
  sender: {
    id: number
    username: string
    displayName: string
    avatarUrl: string | null
    isAI: boolean
  }
}

export async function getConversations(): Promise<ConversationItem[]> {
  const profile = await getCurrentProfile()
  if (!profile) return []

  const rows = await db
    .select()
    .from(conversations)
    .where(
      or(
        eq(conversations.participant1Id, profile.id),
        eq(conversations.participant2Id, profile.id)
      )
    )
    .orderBy(desc(conversations.lastMessageAt))

  if (rows.length === 0) return []

  // Collect other participants
  const otherIds = [
    ...new Set(
      rows.map((r) =>
        r.participant1Id === profile.id ? r.participant2Id : r.participant1Id
      )
    ),
  ]

  const otherProfiles = await db
    .select({
      id: profiles.id,
      username: profiles.username,
      displayName: profiles.displayName,
      avatarUrl: profiles.avatarUrl,
      isAI: profiles.isAI,
      level: profiles.level,
    })
    .from(profiles)
    .where(inArray(profiles.id, otherIds))

  const profileMap = new Map(otherProfiles.map((p) => [p.id, p]))

  // Unread counts per conversation
  const unreadRows = await db
    .select({
      conversationId: directMessages.conversationId,
      unreadCount: sql<number>`count(*)::int`,
    })
    .from(directMessages)
    .where(
      and(
        eq(directMessages.recipientProfileId, profile.id),
        eq(directMessages.isRead, false)
      )
    )
    .groupBy(directMessages.conversationId)

  const unreadMap = new Map(
    unreadRows.map((u) => [u.conversationId, u.unreadCount])
  )

  const result: ConversationItem[] = []
  for (const r of rows) {
    const otherId =
      r.participant1Id === profile.id ? r.participant2Id : r.participant1Id
    const other = profileMap.get(otherId)
    if (!other) continue

    result.push({
      id: r.id,
      participant: other,
      lastMessageAt: r.lastMessageAt,
      lastMessagePreview: r.lastMessagePreview,
      unreadCount: unreadMap.get(r.id) ?? 0,
    })
  }

  return result
}

export async function getMessages(
  conversationId: number
): Promise<{ conversation: ConversationItem | null; messages: DirectMessageItem[] }> {
  const profile = await getCurrentProfile()
  if (!profile) return { conversation: null, messages: [] }

  const [conv] = await db
    .select()
    .from(conversations)
    .where(eq(conversations.id, conversationId))
    .limit(1)

  if (
    !conv ||
    (conv.participant1Id !== profile.id && conv.participant2Id !== profile.id)
  ) {
    return { conversation: null, messages: [] }
  }

  const otherId =
    conv.participant1Id === profile.id ? conv.participant2Id : conv.participant1Id

  const [other] = await db
    .select({
      id: profiles.id,
      username: profiles.username,
      displayName: profiles.displayName,
      avatarUrl: profiles.avatarUrl,
      isAI: profiles.isAI,
      level: profiles.level,
    })
    .from(profiles)
    .where(eq(profiles.id, otherId))
    .limit(1)

  if (!other) return { conversation: null, messages: [] }

  // Mark unread messages sent to current profile as read
  await db
    .update(directMessages)
    .set({ isRead: true })
    .where(
      and(
        eq(directMessages.conversationId, conversationId),
        eq(directMessages.recipientProfileId, profile.id),
        eq(directMessages.isRead, false)
      )
    )

  // Fetch messages
  const msgRows = await db
    .select()
    .from(directMessages)
    .where(eq(directMessages.conversationId, conversationId))
    .orderBy(directMessages.createdAt)
    .limit(100)

  const msgs: DirectMessageItem[] = msgRows.map((m) => {
    const isMe = m.senderProfileId === profile.id
    return {
      id: m.id,
      conversationId: m.conversationId,
      senderProfileId: m.senderProfileId,
      recipientProfileId: m.recipientProfileId,
      content: m.content,
      isRead: m.isRead,
      createdAt: m.createdAt,
      sender: isMe
        ? {
            id: profile.id,
            username: profile.username,
            displayName: profile.displayName,
            avatarUrl: profile.avatarUrl,
            isAI: profile.isAI,
          }
        : other,
    }
  })

  return {
    conversation: {
      id: conv.id,
      participant: other,
      lastMessageAt: conv.lastMessageAt,
      lastMessagePreview: conv.lastMessagePreview,
      unreadCount: 0,
    },
    messages: msgs,
  }
}

export async function getUserConversations(): Promise<ConversationItem[]> {
  return getConversations()
}

export async function getConversationMessages(
  conversationId: number
): Promise<DirectMessageItem[]> {
  const res = await getMessages(conversationId)
  return res.messages
}

export async function sendMessage(recipientProfileId: number, contentRaw: string) {
  const profile = await requireProfile()
  if (profile.id === recipientProfileId) {
    throw new Error("Kendine mesaj gönderemezsin")
  }

  await checkRateLimit(profile.id, "comment")

  const content = contentRaw.trim()
  if (!content) throw new Error("Mesaj boş olamaz")
  if (content.length > 2000) throw new Error("Mesaj en fazla 2000 karakter olabilir")

  const [recipient] = await db
    .select()
    .from(profiles)
    .where(eq(profiles.id, recipientProfileId))
    .limit(1)

  if (!recipient) throw new Error("Kullanıcı bulunamadı")

  // Find or create conversation
  const p1 = Math.min(profile.id, recipientProfileId)
  const p2 = Math.max(profile.id, recipientProfileId)

  let [conv] = await db
    .select()
    .from(conversations)
    .where(
      and(
        eq(conversations.participant1Id, p1),
        eq(conversations.participant2Id, p2)
      )
    )
    .limit(1)

  if (!conv) {
    ;[conv] = await db
      .insert(conversations)
      .values({
        participant1Id: p1,
        participant2Id: p2,
        lastMessageAt: new Date(),
        lastMessagePreview: content.slice(0, 100),
      })
      .returning()
  } else {
    await db
      .update(conversations)
      .set({
        lastMessageAt: new Date(),
        lastMessagePreview: content.slice(0, 100),
      })
      .where(eq(conversations.id, conv.id))
  }

  // Insert direct message
  const [newMsg] = await db
    .insert(directMessages)
    .values({
      conversationId: conv.id,
      senderProfileId: profile.id,
      recipientProfileId: recipient.id,
      content,
      isRead: false,
    })
    .returning()

  // Send notification to recipient
  if (!recipient.isAI) {
    await db.insert(notifications).values({
      profileId: recipient.id,
      actorProfileId: profile.id,
      type: "message",
      message: `${profile.displayName} sana özel mesaj gönderdi: "${content.slice(0, 60)}"`,
    })

    after(() => {
      sendPushToProfile(recipient.id, {
        title: `Mesaj: ${profile.displayName}`,
        body: content.slice(0, 100),
        url: `/mesajlar?conv=${conv.id}`,
      })
    })
  } else {
    // If recipient is AI Persona, generate a persona DM reply!
    const convId = conv.id
    after(async () => {
      try {
        const [persona] = await db
          .select()
          .from(aiPersonas)
          .where(eq(aiPersonas.profileId, recipient.id))
          .limit(1)

        const system = persona
          ? `${persona.systemPrompt}\n\nŞu anda ${profile.displayName} (@${profile.username}) ile özel mesajlaşma (DM) penceresindesin. Karakterine ve tarzına sadık kal. Kısa, samimi, doğrudan bir DM yanıtı ver (maksimum 2-3 cümle).`
          : `Sen bir Türk forumunda aktif bir AI kullanıcısısın (@${recipient.username}). Kısa, esprili ve samimi bir DM yanıtı yaz.`

        const reply = await geminiText({
          system,
          prompt: `Gelen mesaj: "${content}"`,
          temperature: 0.8,
          maxOutputTokens: 250,
        })

        if (reply && reply.trim()) {
          const aiClean = reply.trim()
          await db.insert(directMessages).values({
            conversationId: convId,
            senderProfileId: recipient.id,
            recipientProfileId: profile.id,
            content: aiClean,
            isRead: false,
          })

          await db
            .update(conversations)
            .set({
              lastMessageAt: new Date(),
              lastMessagePreview: aiClean.slice(0, 100),
            })
            .where(eq(conversations.id, convId))

          await db.insert(notifications).values({
            profileId: profile.id,
            actorProfileId: recipient.id,
            type: "message",
            message: `${recipient.displayName} mesajına yanıt verdi: "${aiClean.slice(0, 60)}"`,
          })
        }
      } catch (err) {
        console.warn("[DM] AI reply error:", err)
      }
    })
  }

  revalidatePath("/mesajlar")
  return { conversationId: conv.id, message: newMsg }
}

export async function getUnreadDmCount(): Promise<number> {
  const profile = await getCurrentProfile()
  if (!profile) return 0

  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(directMessages)
    .where(
      and(
        eq(directMessages.recipientProfileId, profile.id),
        eq(directMessages.isRead, false)
      )
    )

  return row?.count ?? 0
}

export async function startConversationByUsername(username: string): Promise<number> {
  const profile = await requireProfile()
  const [recipient] = await db
    .select()
    .from(profiles)
    .where(eq(profiles.username, username.toLowerCase().trim()))
    .limit(1)

  if (!recipient) throw new Error("Kullanıcı bulunamadı")
  if (recipient.id === profile.id) throw new Error("Kendine mesaj gönderemezsin")

  const p1 = Math.min(profile.id, recipient.id)
  const p2 = Math.max(profile.id, recipient.id)

  let [conv] = await db
    .select()
    .from(conversations)
    .where(
      and(
        eq(conversations.participant1Id, p1),
        eq(conversations.participant2Id, p2)
      )
    )
    .limit(1)

  if (!conv) {
    ;[conv] = await db
      .insert(conversations)
      .values({
        participant1Id: p1,
        participant2Id: p2,
        lastMessageAt: new Date(),
        lastMessagePreview: null,
      })
      .returning()
  }

  return conv.id
}

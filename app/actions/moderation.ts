"use server"

import { db } from "@/lib/db"
import {
  announcements,
  categories,
  comments,
  contentRevisions,
  newsletters,
  newsletterSubscribers,
  profiles,
  reports,
  spamFilters,
  topics,
  userPenalties,
} from "@/lib/db/schema"
import { requireAdmin, requirePermission, requireProfile } from "@/lib/session"
import type { PermissionKey, UserRole } from "@/lib/rbac"
import { and, desc, eq, inArray, like, or, sql } from "drizzle-orm"
import { revalidatePath } from "next/cache"

// ============================================================================
// 1. ŞİKAYET KUYRUĞU (REPORT QUEUE)
// ============================================================================

export interface DetailedReportItem {
  id: number
  targetType: string // 'topic' | 'comment' | 'profile'
  targetId: number
  reason: string
  status: string // 'open' | 'resolved' | 'dismissed'
  resolutionNote: string | null
  createdAt: Date
  reporterName: string
  reporterUsername: string | null
  targetTitle: string | null
  targetSnippet: string | null
  targetAuthorName: string | null
  targetAuthorId: number | null
  targetSlug: string | null
}

export async function getDetailedReports(
  statusFilter: string = "open",
  typeFilter: string = "all"
): Promise<DetailedReportItem[]> {
  await requirePermission("canManageReports")

  let query = db
    .select({
      id: reports.id,
      targetType: reports.targetType,
      targetId: reports.targetId,
      reason: reports.reason,
      status: reports.status,
      resolutionNote: reports.resolutionNote,
      createdAt: reports.createdAt,
      reporterName: sql<string>`coalesce(${profiles.displayName}, 'AI Moderatör')`,
      reporterUsername: profiles.username,
    })
    .from(reports)
    .leftJoin(profiles, eq(reports.reporterProfileId, profiles.id))
    .orderBy(desc(reports.createdAt))
    .limit(100)

  const rows = await query

  const filtered = rows.filter((r) => {
    if (statusFilter !== "all" && r.status !== statusFilter) return false
    if (typeFilter !== "all" && r.targetType !== typeFilter) return false
    return true
  })

  // Hydrate target details
  const results: DetailedReportItem[] = []
  for (const r of filtered) {
    let targetTitle: string | null = null
    let targetSnippet: string | null = null
    let targetAuthorName: string | null = null
    let targetAuthorId: number | null = null
    let targetSlug: string | null = null

    try {
      if (r.targetType === "topic") {
        const [top] = await db
          .select({
            title: topics.title,
            content: topics.content,
            slug: topics.slug,
            authorName: profiles.displayName,
            authorId: profiles.id,
          })
          .from(topics)
          .leftJoin(profiles, eq(topics.authorProfileId, profiles.id))
          .where(eq(topics.id, r.targetId))
          .limit(1)

        if (top) {
          targetTitle = top.title
          targetSnippet = top.content ? top.content.slice(0, 180) : null
          targetAuthorName = top.authorName
          targetAuthorId = top.authorId
          targetSlug = top.slug
        }
      } else if (r.targetType === "comment") {
        const [com] = await db
          .select({
            content: comments.content,
            topicSlug: topics.slug,
            topicTitle: topics.title,
            authorName: profiles.displayName,
            authorId: profiles.id,
          })
          .from(comments)
          .leftJoin(topics, eq(comments.topicId, topics.id))
          .leftJoin(profiles, eq(comments.authorProfileId, profiles.id))
          .where(eq(comments.id, r.targetId))
          .limit(1)

        if (com) {
          targetTitle = com.topicTitle ? `Yorum: "${com.topicTitle}"` : "Yorum"
          targetSnippet = com.content ? com.content.slice(0, 180) : null
          targetAuthorName = com.authorName
          targetAuthorId = com.authorId
          targetSlug = com.topicSlug
        }
      } else if (r.targetType === "profile") {
        const [usr] = await db
          .select({
            username: profiles.username,
            displayName: profiles.displayName,
            bio: profiles.bio,
            id: profiles.id,
          })
          .from(profiles)
          .where(eq(profiles.id, r.targetId))
          .limit(1)

        if (usr) {
          targetTitle = `Profil: @${usr.username}`
          targetSnippet = usr.bio ? usr.bio.slice(0, 180) : `Kullanıcı: ${usr.displayName}`
          targetAuthorName = usr.displayName
          targetAuthorId = usr.id
          targetSlug = usr.username
        }
      }
    } catch {
      // ignore
    }

    results.push({
      ...r,
      targetTitle,
      targetSnippet,
      targetAuthorName,
      targetAuthorId,
      targetSlug,
    })
  }

  return results
}

export async function resolveReportDetailed(
  reportId: number,
  action: "delete" | "lock" | "dismiss",
  resolutionNote?: string
) {
  const me = await requirePermission("canManageReports")

  const [report] = await db.select().from(reports).where(eq(reports.id, reportId)).limit(1)
  if (!report) throw new Error("Rapor bulunamadı")

  if (action === "delete") {
    if (report.targetType === "comment") {
      const [oldComment] = await db.select().from(comments).where(eq(comments.id, report.targetId)).limit(1)
      if (oldComment) {
        // Record revision before deleting
        await recordContentRevision(
          "comment",
          report.targetId,
          oldComment.content,
          undefined,
          me.id,
          `Moderatör tarafından silindi (Rapor #${reportId})`
        )
        await db
          .update(comments)
          .set({ isDeleted: true, content: "[moderatör tarafından kural ihlali nedeniyle silindi]" })
          .where(eq(comments.id, report.targetId))
      }
    } else if (report.targetType === "topic") {
      const [oldTopic] = await db.select().from(topics).where(eq(topics.id, report.targetId)).limit(1)
      if (oldTopic) {
        await recordContentRevision(
          "topic",
          report.targetId,
          oldTopic.content,
          oldTopic.title,
          me.id,
          `Moderatör tarafından kilitlendi/kaldırıldı (Rapor #${reportId})`
        )
        await db.update(topics).set({ isLocked: true }).where(eq(topics.id, report.targetId))
      }
    }
  } else if (action === "lock" && report.targetType === "topic") {
    await db.update(topics).set({ isLocked: true }).where(eq(topics.id, report.targetId))
  }

  const finalStatus = action === "dismiss" ? "dismissed" : "resolved"
  await db
    .update(reports)
    .set({
      status: finalStatus,
      resolutionNote: resolutionNote || (action === "dismiss" ? "Yoksayıldı" : "İşlem uygulandı"),
      resolvedByProfileId: me.id,
      resolvedAt: new Date(),
    })
    .where(eq(reports.id, reportId))

  revalidatePath("/admin/moderasyon")
  return { success: true }
}

// ============================================================================
// 2. TOPLU İŞLEMLER (BULK ACTIONS)
// ============================================================================

export interface BulkTopicItem {
  id: number
  title: string
  slug: string
  categoryName: string
  categoryId: number
  authorName: string
  authorUsername: string
  isLocked: boolean
  isPinned: boolean
  isHot: boolean
  commentCount: number
  createdAt: Date
}

export async function getBulkTopicsList(limit = 40): Promise<{ topics: BulkTopicItem[]; categories: Array<{ id: number; name: string }> }> {
  await requirePermission("canLockTopics")

  const rows = await db
    .select({
      id: topics.id,
      title: topics.title,
      slug: topics.slug,
      categoryName: categories.name,
      categoryId: categories.id,
      authorName: profiles.displayName,
      authorUsername: profiles.username,
      isLocked: topics.isLocked,
      isPinned: topics.isPinned,
      isHot: topics.isHot,
      commentCount: topics.commentCount,
      createdAt: topics.createdAt,
    })
    .from(topics)
    .innerJoin(categories, eq(topics.categoryId, categories.id))
    .innerJoin(profiles, eq(topics.authorProfileId, profiles.id))
    .orderBy(desc(topics.createdAt))
    .limit(limit)

  const cats = await db.select({ id: categories.id, name: categories.name }).from(categories)

  return { topics: rows, categories: cats }
}

export async function bulkUpdateTopics(
  topicIds: number[],
  action: "lock" | "unlock" | "pin" | "unpin" | "hot" | "unhot" | "delete" | "change_category",
  targetCategoryId?: number
) {
  const me = await requirePermission("canLockTopics")
  if (!topicIds || topicIds.length === 0) {
    throw new Error("Lütfen en az bir konu seçin")
  }

  if (action === "lock") {
    await db.update(topics).set({ isLocked: true }).where(inArray(topics.id, topicIds))
  } else if (action === "unlock") {
    await db.update(topics).set({ isLocked: false }).where(inArray(topics.id, topicIds))
  } else if (action === "pin") {
    await requirePermission("canPinTopics")
    await db.update(topics).set({ isPinned: true }).where(inArray(topics.id, topicIds))
  } else if (action === "unpin") {
    await requirePermission("canPinTopics")
    await db.update(topics).set({ isPinned: false }).where(inArray(topics.id, topicIds))
  } else if (action === "hot") {
    await db.update(topics).set({ isHot: true }).where(inArray(topics.id, topicIds))
  } else if (action === "unhot") {
    await db.update(topics).set({ isHot: false }).where(inArray(topics.id, topicIds))
  } else if (action === "change_category" && targetCategoryId) {
    await db.update(topics).set({ categoryId: targetCategoryId }).where(inArray(topics.id, topicIds))
  } else if (action === "delete") {
    await requirePermission("canDeleteTopics")
    for (const tid of topicIds) {
      const [t] = await db.select().from(topics).where(eq(topics.id, tid)).limit(1)
      if (t) {
        await recordContentRevision("topic", tid, t.content, t.title, me.id, "Toplu moderasyon silme")
      }
    }
    // Delete comments first then topics
    await db.delete(comments).where(inArray(comments.topicId, topicIds))
    await db.delete(topics).where(inArray(topics.id, topicIds))
  }

  revalidatePath("/admin/moderasyon")
  revalidatePath("/")
  return { success: true, count: topicIds.length }
}

// ============================================================================
// 3. SPAM & KELİME FİLTRESİ (BLACKLIST)
// ============================================================================

export async function getSpamFilters() {
  await requirePermission("canManageSpamFilters")
  return db.select().from(spamFilters).orderBy(desc(spamFilters.createdAt))
}

export async function createSpamFilter(formData: FormData) {
  await requirePermission("canManageSpamFilters")
  const pattern = String(formData.get("pattern") ?? "").trim()
  const type = String(formData.get("type") ?? "word")
  const action = String(formData.get("action") ?? "block")
  const replacement = String(formData.get("replacement") ?? "***").trim()

  if (!pattern) throw new Error("Filtre kalıbı/kelimesi boş olamaz")

  await db.insert(spamFilters).values({
    pattern,
    type: type as any,
    action: action as any,
    replacement: replacement || "***",
    isActive: true,
  })

  revalidatePath("/admin/moderasyon")
  return { success: true }
}

export async function toggleSpamFilter(id: number, isActive: boolean) {
  await requirePermission("canManageSpamFilters")
  await db.update(spamFilters).set({ isActive }).where(eq(spamFilters.id, id))
  revalidatePath("/admin/moderasyon")
  return { success: true }
}

export async function deleteSpamFilter(id: number) {
  await requirePermission("canManageSpamFilters")
  await db.delete(spamFilters).where(eq(spamFilters.id, id))
  revalidatePath("/admin/moderasyon")
  return { success: true }
}

export async function testSpamFilterSandbox(text: string) {
  await requirePermission("canManageSpamFilters")
  const { checkAndFilterContent } = await import("@/lib/spam")
  const result = await checkAndFilterContent(text)
  return result
}

// ============================================================================
// 4. İÇERİK SÜRÜM GEÇMİŞİ (EDIT HISTORY)
// ============================================================================

export async function recordContentRevision(
  targetType: "topic" | "comment",
  targetId: number,
  previousContent: string,
  previousTitle?: string,
  editedByProfileId?: number,
  reason?: string
) {
  try {
    await db.insert(contentRevisions).values({
      targetType,
      targetId,
      previousTitle: previousTitle || null,
      previousContent,
      editedByProfileId: editedByProfileId || 1,
      reason: reason || "Düzenleme",
    })
  } catch (err) {
    console.error("[revision] save error:", err)
  }
}

export async function getContentRevisions(targetType: "topic" | "comment", targetId: number) {
  const rows = await db
    .select({
      id: contentRevisions.id,
      previousTitle: contentRevisions.previousTitle,
      previousContent: contentRevisions.previousContent,
      reason: contentRevisions.reason,
      createdAt: contentRevisions.createdAt,
      editorName: profiles.displayName,
      editorUsername: profiles.username,
    })
    .from(contentRevisions)
    .leftJoin(profiles, eq(contentRevisions.editedByProfileId, profiles.id))
    .where(and(eq(contentRevisions.targetType, targetType), eq(contentRevisions.targetId, targetId)))
    .orderBy(desc(contentRevisions.createdAt))

  return rows
}

export async function getAllRevisions(limit = 40) {
  await requirePermission("canViewAuditLogs")

  const rows = await db
    .select({
      id: contentRevisions.id,
      targetType: contentRevisions.targetType,
      targetId: contentRevisions.targetId,
      previousTitle: contentRevisions.previousTitle,
      previousContent: contentRevisions.previousContent,
      reason: contentRevisions.reason,
      createdAt: contentRevisions.createdAt,
      editorName: profiles.displayName,
      editorUsername: profiles.username,
    })
    .from(contentRevisions)
    .leftJoin(profiles, eq(contentRevisions.editedByProfileId, profiles.id))
    .orderBy(desc(contentRevisions.createdAt))
    .limit(limit)

  return rows
}

// ============================================================================
// 5. KULLANICI & ROL (RBAC) VE CEZA SİSTEMİ
// ============================================================================

export interface UserManagementItem {
  id: number
  username: string
  displayName: string
  avatarUrl: string | null
  role: UserRole
  isAdmin: boolean
  isBanned: boolean
  isMuted: boolean
  isShadowBanned: boolean
  bannedUntil: Date | null
  mutedUntil: Date | null
  karma: number
  xp: number
  level: number
  createdAt: Date
  customPermissions: Record<string, boolean> | null
  activePenaltiesCount: number
}

export async function getUserManagementList(
  search = "",
  roleFilter = "all"
): Promise<UserManagementItem[]> {
  await requireAdmin()

  let q = db
    .select({
      id: profiles.id,
      username: profiles.username,
      displayName: profiles.displayName,
      avatarUrl: profiles.avatarUrl,
      role: sql<string>`coalesce(${profiles.role}, 'user')`,
      isAdmin: profiles.isAdmin,
      isBanned: profiles.isBanned,
      isMuted: profiles.isMuted,
      isShadowBanned: profiles.isShadowBanned,
      bannedUntil: profiles.bannedUntil,
      mutedUntil: profiles.mutedUntil,
      karma: profiles.karma,
      xp: profiles.xp,
      level: profiles.level,
      createdAt: profiles.createdAt,
      customPermissions: profiles.customPermissions,
    })
    .from(profiles)
    .where(eq(profiles.isAI, false))
    .orderBy(desc(profiles.createdAt))
    .limit(100)

  const rows = await q

  const filtered = rows.filter((u) => {
    if (roleFilter !== "all" && u.role !== roleFilter) return false
    if (search.trim()) {
      const term = search.toLowerCase()
      const matchU = u.username.toLowerCase().includes(term)
      const matchD = u.displayName.toLowerCase().includes(term)
      return matchU || matchD
    }
    return true
  })

  return filtered.map((u) => ({
    ...u,
    role: (u.role as UserRole) || "user",
    activePenaltiesCount: (u.isBanned ? 1 : 0) + (u.isMuted ? 1 : 0) + (u.isShadowBanned ? 1 : 0),
  }))
}

export async function updateUserRoleAndPermissions(
  targetProfileId: number,
  role: UserRole,
  customPermissions?: Record<string, boolean>
) {
  const me = await requireAdmin()
  if (me.id === targetProfileId) {
    throw new Error("Kendi rolünüzü doğrudan değiştiremezsiniz")
  }

  const isAdminRole = role === "superadmin" || role === "admin"

  await db
    .update(profiles)
    .set({
      role,
      isAdmin: isAdminRole,
      customPermissions: customPermissions || {},
    })
    .where(eq(profiles.id, targetProfileId))

  revalidatePath("/admin/kullanicilar")
  return { success: true }
}

export async function penalizeUser(
  targetProfileId: number,
  actionType: "ban" | "mute" | "shadowban" | "warn" | "ipban",
  reason: string,
  durationHours?: number | null,
  ipAddress?: string
) {
  const me = await requirePermission("canBanUsers")
  if (me.id === targetProfileId) {
    throw new Error("Kendinize ceza uygulayamazsınız")
  }

  if (!reason.trim()) {
    throw new Error("Lütfen ceza için geçerli bir gerekçe belirtin")
  }

  const expiresAt =
    durationHours && durationHours > 0
      ? new Date(Date.now() + durationHours * 3600 * 1000)
      : null

  // Record penalty
  await db.insert(userPenalties).values({
    targetProfileId,
    moderatorProfileId: me.id,
    actionType,
    reason: reason.trim(),
    durationHours: durationHours || null,
    expiresAt,
    ipAddress: ipAddress || null,
    isActive: actionType !== "warn",
  })

  // Apply to profile flags
  if (actionType === "ban") {
    await db
      .update(profiles)
      .set({ isBanned: true, bannedUntil: expiresAt })
      .where(eq(profiles.id, targetProfileId))
  } else if (actionType === "mute") {
    await db
      .update(profiles)
      .set({ isMuted: true, mutedUntil: expiresAt })
      .where(eq(profiles.id, targetProfileId))
  } else if (actionType === "shadowban") {
    await db
      .update(profiles)
      .set({ isShadowBanned: true })
      .where(eq(profiles.id, targetProfileId))
  }

  revalidatePath("/admin/kullanicilar")
  return { success: true }
}

export async function revokePenalty(targetProfileId: number, penaltyType: "ban" | "mute" | "shadowban") {
  await requirePermission("canBanUsers")

  if (penaltyType === "ban") {
    await db
      .update(profiles)
      .set({ isBanned: false, bannedUntil: null })
      .where(eq(profiles.id, targetProfileId))
  } else if (penaltyType === "mute") {
    await db
      .update(profiles)
      .set({ isMuted: false, mutedUntil: null })
      .where(eq(profiles.id, targetProfileId))
  } else if (penaltyType === "shadowban") {
    await db
      .update(profiles)
      .set({ isShadowBanned: false })
      .where(eq(profiles.id, targetProfileId))
  }

  // Deactivate active penalties for this type
  await db
    .update(userPenalties)
    .set({ isActive: false })
    .where(and(eq(userPenalties.targetProfileId, targetProfileId), eq(userPenalties.actionType, penaltyType)))

  revalidatePath("/admin/kullanicilar")
  return { success: true }
}

export async function getUserInspection(profileId: number) {
  await requireAdmin()

  const [profile] = await db.select().from(profiles).where(eq(profiles.id, profileId)).limit(1)
  if (!profile) throw new Error("Kullanıcı bulunamadı")

  // Recent topics
  const userTopics = await db
    .select({
      id: topics.id,
      title: topics.title,
      slug: topics.slug,
      createdAt: topics.createdAt,
      commentCount: topics.commentCount,
      viewCount: topics.viewCount,
      isLocked: topics.isLocked,
    })
    .from(topics)
    .where(eq(topics.authorProfileId, profileId))
    .orderBy(desc(topics.createdAt))
    .limit(8)

  // Recent comments
  const userComments = await db
    .select({
      id: comments.id,
      content: comments.content,
      createdAt: comments.createdAt,
      topicTitle: topics.title,
      topicSlug: topics.slug,
      isDeleted: comments.isDeleted,
    })
    .from(comments)
    .leftJoin(topics, eq(comments.topicId, topics.id))
    .where(eq(comments.authorProfileId, profileId))
    .orderBy(desc(comments.createdAt))
    .limit(8)

  // Penalties history
  const penalties = await db
    .select({
      id: userPenalties.id,
      actionType: userPenalties.actionType,
      reason: userPenalties.reason,
      durationHours: userPenalties.durationHours,
      expiresAt: userPenalties.expiresAt,
      isActive: userPenalties.isActive,
      createdAt: userPenalties.createdAt,
      moderatorName: profiles.displayName,
    })
    .from(userPenalties)
    .leftJoin(profiles, eq(userPenalties.moderatorProfileId, profiles.id))
    .where(eq(userPenalties.targetProfileId, profileId))
    .orderBy(desc(userPenalties.createdAt))

  // Reports received
  const receivedReports = await db
    .select({
      id: reports.id,
      targetType: reports.targetType,
      reason: reports.reason,
      status: reports.status,
      createdAt: reports.createdAt,
    })
    .from(reports)
    .where(
      or(
        and(eq(reports.targetType, "profile"), eq(reports.targetId, profileId)),
        inArray(
          reports.targetId,
          userTopics.map((t) => t.id).concat(userComments.map((c) => c.id))
        )
      )
    )
    .orderBy(desc(reports.createdAt))
    .limit(10)

  return {
    profile,
    topics: userTopics,
    comments: userComments,
    penalties,
    reports: receivedReports,
  }
}

// ============================================================================
// 6. BÜLTEN EDİTÖRÜ & GÖNDERİM YÖNETİMİ
// ============================================================================

export async function getNewsletters() {
  await requireAdmin()
  return db.select().from(newsletters).orderBy(desc(newsletters.createdAt))
}

export async function getNewsletterSubscriberStats() {
  const [totalSubscribers] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(newsletterSubscribers)
    .where(eq(newsletterSubscribers.isActive, true))

  const [sentCount] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(newsletters)
    .where(eq(newsletters.status, "sent"))

  return {
    subscribersCount: totalSubscribers?.count || 0,
    sentNewslettersCount: sentCount?.count || 0,
  }
}

export async function createNewsletter(title: string, content: string) {
  await requirePermission("canManageNewsletters")
  if (!title.trim() || !content.trim()) {
    throw new Error("Başlık ve bülten içeriği zorunludur")
  }

  const [row] = await db
    .insert(newsletters)
    .values({
      title: title.trim(),
      content: content.trim(),
      status: "draft",
    })
    .returning()

  revalidatePath("/admin/bulten")
  return row
}

export async function updateNewsletter(id: number, title: string, content: string) {
  await requirePermission("canManageNewsletters")
  await db
    .update(newsletters)
    .set({
      title: title.trim(),
      content: content.trim(),
      updatedAt: new Date(),
    })
    .where(eq(newsletters.id, id))

  revalidatePath("/admin/bulten")
  return { success: true }
}

export async function sendNewsletter(id: number) {
  await requirePermission("canManageNewsletters")
  const [n] = await db.select().from(newsletters).where(eq(newsletters.id, id)).limit(1)
  if (!n) throw new Error("Bülten bulunamadı")

  const [subscribers] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(newsletterSubscribers)
    .where(eq(newsletterSubscribers.isActive, true))

  const recipientCount = Math.max(subscribers?.count || 0, 1)

  await db
    .update(newsletters)
    .set({
      status: "sent",
      sentAt: new Date(),
      recipientCount,
      updatedAt: new Date(),
    })
    .where(eq(newsletters.id, id))

  revalidatePath("/admin/bulten")
  revalidatePath("/bulten")
  return { success: true, recipientCount }
}

export async function deleteNewsletter(id: number) {
  await requirePermission("canManageNewsletters")
  await db.delete(newsletters).where(eq(newsletters.id, id))
  revalidatePath("/admin/bulten")
  return { success: true }
}

export async function getPublicNewsletters() {
  return db
    .select()
    .from(newsletters)
    .where(eq(newsletters.status, "sent"))
    .orderBy(desc(newsletters.sentAt))
    .limit(20)
}

// ============================================================================
// 7. ÖNEMLİ DUYURU BANNER'I
// ============================================================================

export async function getAnnouncements() {
  await requireAdmin()
  return db.select().from(announcements).orderBy(desc(announcements.createdAt))
}

export async function getActiveAnnouncement() {
  const [active] = await db
    .select()
    .from(announcements)
    .where(eq(announcements.isActive, true))
    .orderBy(desc(announcements.createdAt))
    .limit(1)

  return active || null
}

export async function createAnnouncement(formData: FormData) {
  await requirePermission("canManageAnnouncements")

  const title = String(formData.get("title") ?? "").trim()
  const message = String(formData.get("message") ?? "").trim()
  const linkUrl = String(formData.get("linkUrl") ?? "").trim() || null
  const linkText = String(formData.get("linkText") ?? "").trim() || null
  const bannerType = String(formData.get("bannerType") ?? "info")

  if (!title || !message) {
    throw new Error("Başlık ve mesaj metni zorunludur")
  }

  // Deactivate existing active ones if any
  await db.update(announcements).set({ isActive: false })

  await db.insert(announcements).values({
    title,
    message,
    linkUrl,
    linkText,
    bannerType: bannerType as any,
    isActive: true,
  })

  revalidatePath("/admin/duyurular")
  revalidatePath("/")
  return { success: true }
}

export async function toggleAnnouncement(id: number, isActive: boolean) {
  await requirePermission("canManageAnnouncements")
  await db.update(announcements).set({ isActive }).where(eq(announcements.id, id))
  revalidatePath("/admin/duyurular")
  revalidatePath("/")
  return { success: true }
}

export async function deleteAnnouncement(id: number) {
  await requirePermission("canManageAnnouncements")
  await db.delete(announcements).where(eq(announcements.id, id))
  revalidatePath("/admin/duyurular")
  revalidatePath("/")
  return { success: true }
}

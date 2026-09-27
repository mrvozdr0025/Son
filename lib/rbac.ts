export type UserRole =
  | "superadmin"
  | "admin"
  | "moderator"
  | "leader"
  | "verified"
  | "user"

export type PermissionKey =
  | "canLockTopics"
  | "canPinTopics"
  | "canDeleteTopics"
  | "canDeleteComments"
  | "canManageReports"
  | "canBanUsers"
  | "canManageAnnouncements"
  | "canManageNewsletters"
  | "canManageSpamFilters"
  | "canViewAuditLogs"

export interface RoleDefinition {
  key: UserRole
  label: string
  color: string
  description: string
  permissions: Record<PermissionKey, boolean>
}

export const ROLE_DEFINITIONS: Record<UserRole, RoleDefinition> = {
  superadmin: {
    key: "superadmin",
    label: "Süper Admin",
    color: "text-amber-400 border-amber-400/30 bg-amber-500/10",
    description: "Tüm sistem yetkilerine ve kurucu seviyesinde tam erişime sahip.",
    permissions: {
      canLockTopics: true,
      canPinTopics: true,
      canDeleteTopics: true,
      canDeleteComments: true,
      canManageReports: true,
      canBanUsers: true,
      canManageAnnouncements: true,
      canManageNewsletters: true,
      canManageSpamFilters: true,
      canViewAuditLogs: true,
    },
  },
  admin: {
    key: "admin",
    label: "Yönetici (Admin)",
    color: "text-red-400 border-red-400/30 bg-red-500/10",
    description: "Sistem, moderasyon, bülten ve kullanıcı yönetim yetkilerine sahip.",
    permissions: {
      canLockTopics: true,
      canPinTopics: true,
      canDeleteTopics: true,
      canDeleteComments: true,
      canManageReports: true,
      canBanUsers: true,
      canManageAnnouncements: true,
      canManageNewsletters: true,
      canManageSpamFilters: true,
      canViewAuditLogs: true,
    },
  },
  moderator: {
    key: "moderator",
    label: "Moderatör",
    color: "text-cyan-400 border-cyan-400/30 bg-cyan-500/10",
    description: "Şikayet kuyruğunu yönetir, konu kilitler/siler, kural dışı üyeleri susturur.",
    permissions: {
      canLockTopics: true,
      canPinTopics: true,
      canDeleteTopics: true,
      canDeleteComments: true,
      canManageReports: true,
      canBanUsers: true,
      canManageAnnouncements: false,
      canManageNewsletters: false,
      canManageSpamFilters: true,
      canViewAuditLogs: true,
    },
  },
  leader: {
    key: "leader",
    label: "Topluluk Lideri",
    color: "text-purple-400 border-purple-400/30 bg-purple-500/10",
    description: "Topluluk tartışmalarını yönlendirir, faydalı konuları öne çıkarabilir.",
    permissions: {
      canLockTopics: true,
      canPinTopics: true,
      canDeleteTopics: false,
      canDeleteComments: false,
      canManageReports: false,
      canBanUsers: false,
      canManageAnnouncements: false,
      canManageNewsletters: false,
      canManageSpamFilters: false,
      canViewAuditLogs: false,
    },
  },
  verified: {
    key: "verified",
    label: "Doğrulanmış Üye",
    color: "text-emerald-400 border-emerald-400/30 bg-emerald-500/10",
    description: "Kimliği veya güvenilirliği onaylanmış saygın topluluk üyesi.",
    permissions: {
      canLockTopics: false,
      canPinTopics: false,
      canDeleteTopics: false,
      canDeleteComments: false,
      canManageReports: false,
      canBanUsers: false,
      canManageAnnouncements: false,
      canManageNewsletters: false,
      canManageSpamFilters: false,
      canViewAuditLogs: false,
    },
  },
  user: {
    key: "user",
    label: "Standart Üye",
    color: "text-muted-foreground border-border bg-card",
    description: "Temel forum yetkilerine sahip kayıtlı kullanıcı.",
    permissions: {
      canLockTopics: false,
      canPinTopics: false,
      canDeleteTopics: false,
      canDeleteComments: false,
      canManageReports: false,
      canBanUsers: false,
      canManageAnnouncements: false,
      canManageNewsletters: false,
      canManageSpamFilters: false,
      canViewAuditLogs: false,
    },
  },
}

export const PERMISSION_LABELS: Record<PermissionKey, { label: string; desc: string }> = {
  canLockTopics: { label: "Konu Kilitleme", desc: "Konuları yoruma kapatabilir ve açabilir" },
  canPinTopics: { label: "Konu Sabitleme", desc: "Konuları listenin en üstüne sabitleyebilir" },
  canDeleteTopics: { label: "Konu Silme", desc: "Kural ihlali yapan konuları silebilir" },
  canDeleteComments: { label: "Yorum Silme", desc: "Uygunsuz yorumları silebilir" },
  canManageReports: { label: "Şikayet Yönetimi", desc: "Kullanıcı bildirimlerini inceleyip karar verebilir" },
  canBanUsers: { label: "Ceza & Askıya Alma", desc: "Kullanıcıları banlayabilir veya susturabilir" },
  canManageAnnouncements: { label: "Duyuru Yönetimi", desc: "Site genelinde banner duyuruları yayınlayabilir" },
  canManageNewsletters: { label: "Bülten Gönderimi", desc: "E-posta bülteni hazırlayıp toplu gönderebilir" },
  canManageSpamFilters: { label: "Spam & Kelime Filtresi", desc: "Yasaklı kelime ve domain listesini düzenleyebilir" },
  canViewAuditLogs: { label: "Denetim & Geçmiş", desc: "İçerik revizyonlarını ve denetim loglarını görebilir" },
}

export function hasPermission(
  profile: {
    isAdmin?: boolean | null
    role?: string | null
    customPermissions?: Record<string, boolean> | null
  } | null | undefined,
  permission: PermissionKey
): boolean {
  if (!profile) return false
  if (profile.isAdmin) return true // Legacy fallback: isAdmin allows everything

  const role = (profile.role as UserRole) || "user"
  const roleDef = ROLE_DEFINITIONS[role] || ROLE_DEFINITIONS.user

  // Check custom permission override if set
  if (profile.customPermissions && typeof profile.customPermissions[permission] === "boolean") {
    return profile.customPermissions[permission]
  }

  return roleDef.permissions[permission] ?? false
}

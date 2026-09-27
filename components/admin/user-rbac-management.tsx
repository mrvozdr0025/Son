"use client"

import { useState, useTransition } from "react"
import Link from "next/link"
import {
  AlertTriangle,
  Ban,
  Check,
  CheckCircle,
  Clock,
  ExternalLink,
  Eye,
  Filter,
  KeyRound,
  MessageSquare,
  Search,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Slash,
  Trash2,
  Unlock,
  User,
  UserCheck,
  VolumeX,
  X,
} from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import {
  getUserInspection,
  getUserManagementList,
  penalizeUser,
  revokePenalty,
  updateUserRoleAndPermissions,
  type UserManagementItem,
} from "@/app/actions/moderation"
import {
  ROLE_DEFINITIONS,
  PERMISSION_LABELS,
  type PermissionKey,
  type UserRole,
} from "@/lib/rbac"
import { timeAgo } from "@/lib/format"

interface Props {
  initialUsers: UserManagementItem[]
}

export function UserRbacManagement({ initialUsers }: Props) {
  const [users, setUsers] = useState<UserManagementItem[]>(initialUsers)
  const [search, setSearch] = useState("")
  const [roleFilter, setRoleFilter] = useState("all")
  const [pending, startTransition] = useTransition()

  // Modals state
  const [roleModalUser, setRoleModalUser] = useState<UserManagementItem | null>(null)
  const [selectedRole, setSelectedRole] = useState<UserRole>("user")
  const [customPermissions, setCustomPermissions] = useState<Record<string, boolean>>({})

  const [penaltyModalUser, setPenaltyModalUser] = useState<UserManagementItem | null>(null)
  const [penaltyType, setPenaltyType] = useState<"ban" | "mute" | "shadowban" | "warn" | "ipban">("mute")
  const [penaltyReason, setPenaltyReason] = useState("")
  const [penaltyDurationHours, setPenaltyDurationHours] = useState<number | null>(24)

  const [inspectUser, setInspectUser] = useState<any | null>(null)
  const [inspectLoading, setInspectLoading] = useState(false)

  // Reload list
  const reloadUsers = (query = search, role = roleFilter) => {
    startTransition(async () => {
      const data = await getUserManagementList(query, role)
      setUsers(data)
    })
  }

  // --- Role Modal Handlers ---
  const openRoleModal = (u: UserManagementItem) => {
    setRoleModalUser(u)
    setSelectedRole(u.role)
    const basePerms = { ...ROLE_DEFINITIONS[u.role]?.permissions }
    if (u.customPermissions) {
      Object.assign(basePerms, u.customPermissions)
    }
    setCustomPermissions(basePerms)
  }

  const handleRoleChange = (role: UserRole) => {
    setSelectedRole(role)
    setCustomPermissions({ ...ROLE_DEFINITIONS[role].permissions })
  }

  const toggleCustomPermission = (permKey: string) => {
    setCustomPermissions((prev) => ({
      ...prev,
      [permKey]: !prev[permKey],
    }))
  }

  const saveRoleAndPermissions = () => {
    if (!roleModalUser) return
    startTransition(async () => {
      await updateUserRoleAndPermissions(roleModalUser.id, selectedRole, customPermissions)
      reloadUsers()
      setRoleModalUser(null)
    })
  }

  // --- Penalty Modal Handlers ---
  const openPenaltyModal = (u: UserManagementItem) => {
    setPenaltyModalUser(u)
    setPenaltyType("mute")
    setPenaltyReason("")
    setPenaltyDurationHours(24)
  }

  const submitPenalty = () => {
    if (!penaltyModalUser || !penaltyReason.trim()) return
    startTransition(async () => {
      await penalizeUser(
        penaltyModalUser.id,
        penaltyType,
        penaltyReason.trim(),
        penaltyDurationHours
      )
      reloadUsers()
      setPenaltyModalUser(null)
    })
  }

  const handleRevokePenalty = (u: UserManagementItem, type: "ban" | "mute" | "shadowban") => {
    startTransition(async () => {
      await revokePenalty(u.id, type)
      reloadUsers()
    })
  }

  // --- Inspection Dossier Handlers ---
  const openInspection = async (u: UserManagementItem) => {
    setInspectLoading(true)
    try {
      const data = await getUserInspection(u.id)
      setInspectUser(data)
    } catch (err) {
      console.error(err)
    } finally {
      setInspectLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col gap-1 border-b border-border/60 pb-4">
        <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
          Kullanıcı & Rol (RBAC) Yönetimi
        </h1>
        <p className="text-xs text-muted-foreground sm:text-sm">
          Üyelerin rollerini ve yetki matrisini yapılandırın, ceza/askıya alma uygulayın veya kullanıcı inceleme kartını açın.
        </p>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border/70 bg-card p-3 shadow-sm">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3 top-2.5 size-3.5 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              reloadUsers(e.target.value, roleFilter)
            }}
            placeholder="Kullanıcı adı veya isim ile ara..."
            className="pl-8 text-xs h-8"
          />
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs font-semibold text-muted-foreground mr-1">Rol Filtresi:</span>
          {(["all", "superadmin", "admin", "moderator", "leader", "verified", "user"] as const).map(
            (r) => (
              <button
                key={r}
                onClick={() => {
                  setRoleFilter(r)
                  reloadUsers(search, r)
                }}
                className={`rounded-md px-2.5 py-1 text-xs font-medium transition ${
                  roleFilter === r
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "bg-muted/50 text-muted-foreground hover:bg-muted"
                }`}
              >
                {r === "all" ? "Tümü" : ROLE_DEFINITIONS[r]?.label || r}
              </button>
            )
          )}
        </div>
      </div>

      {/* Users Table */}
      <div className="overflow-x-auto rounded-lg border border-border/70 bg-card">
        <table className="w-full text-left text-xs">
          <thead className="border-b border-border/80 bg-muted/40 text-muted-foreground">
            <tr>
              <th className="p-3">Kullanıcı</th>
              <th className="p-3">Rol</th>
              <th className="p-3">Ceza Durumu</th>
              <th className="p-3 text-center">Karma / XP</th>
              <th className="p-3 text-center">Kayıt Tarihi</th>
              <th className="p-3 text-right">İşlemler</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/50">
            {users.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-8 text-center text-muted-foreground">
                  Aramanıza uygun kullanıcı bulunamadı.
                </td>
              </tr>
            ) : (
              users.map((u) => {
                const roleDef = ROLE_DEFINITIONS[u.role] || ROLE_DEFINITIONS.user
                return (
                  <tr key={u.id} className="hover:bg-muted/30 transition">
                    {/* User info */}
                    <td className="p-3">
                      <div className="flex items-center gap-2.5">
                        <Avatar className="size-8 rounded-md border border-border">
                          <AvatarImage src={u.avatarUrl || ""} alt={u.username} />
                          <AvatarFallback className="rounded-md text-[11px] font-bold">
                            {u.displayName.slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <Link
                              href={`/profil/${u.username}`}
                              className="font-medium text-foreground hover:text-primary transition"
                            >
                              {u.displayName}
                            </Link>
                            <Badge variant="outline" className="text-[10px] h-4 px-1 py-0">
                              Lvl {u.level}
                            </Badge>
                          </div>
                          <span className="text-[11px] text-muted-foreground">@{u.username}</span>
                        </div>
                      </div>
                    </td>

                    {/* Role */}
                    <td className="p-3">
                      <span
                        className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-medium ${roleDef.color}`}
                      >
                        <Shield className="size-3" />
                        {roleDef.label}
                      </span>
                    </td>

                    {/* Penalties Status */}
                    <td className="p-3">
                      <div className="flex flex-wrap items-center gap-1">
                        {u.isBanned && (
                          <Badge variant="destructive" className="text-[10px] flex items-center gap-0.5">
                            <Ban className="size-2.5" />
                            Banlı
                          </Badge>
                        )}
                        {u.isMuted && (
                          <Badge variant="secondary" className="bg-amber-500/20 text-amber-300 text-[10px] flex items-center gap-0.5">
                            <VolumeX className="size-2.5" />
                            Susturulmuş
                          </Badge>
                        )}
                        {u.isShadowBanned && (
                          <Badge variant="outline" className="text-[10px] text-purple-400 border-purple-500/30">
                            Shadowban
                          </Badge>
                        )}
                        {!u.isBanned && !u.isMuted && !u.isShadowBanned && (
                          <span className="text-emerald-400 flex items-center gap-1 text-[11px]">
                            <CheckCircle className="size-3" /> Temiz
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Stats */}
                    <td className="p-3 text-center text-muted-foreground font-mono">
                      <span className="font-semibold text-foreground">{u.karma}</span> / {u.xp} XP
                    </td>

                    {/* Join Date */}
                    <td className="p-3 text-center text-muted-foreground">
                      {timeAgo(u.createdAt)}
                    </td>

                    {/* Actions */}
                    <td className="p-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => openInspection(u)}
                          className="h-7 px-2 text-xs"
                          title="Kullanıcı İnceleme Kartı"
                        >
                          <Eye className="size-3.5 text-cyan-400 mr-1" />
                          İncele
                        </Button>

                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openRoleModal(u)}
                          className="h-7 px-2 text-xs"
                        >
                          <KeyRound className="size-3.5 mr-1" />
                          Rol / Yetki
                        </Button>

                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openPenaltyModal(u)}
                          className="h-7 px-2 text-xs text-red-400 hover:text-red-300"
                        >
                          <AlertTriangle className="size-3.5 mr-1" />
                          Ceza Ver
                        </Button>

                        {/* Quick Unban / Unmute if penalized */}
                        {u.isBanned && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleRevokePenalty(u, "ban")}
                            className="h-7 px-2 text-xs text-emerald-400 hover:text-emerald-300"
                            title="Banı Kaldır"
                          >
                            <Unlock className="size-3.5 mr-1" />
                            Ban Kaldır
                          </Button>
                        )}

                        {u.isMuted && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleRevokePenalty(u, "mute")}
                            className="h-7 px-2 text-xs text-amber-400 hover:text-amber-300"
                            title="Susturmayı Kaldır"
                          >
                            <Unlock className="size-3.5 mr-1" />
                            Mute Kaldır
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {/* ========================================================================= */}
      {/* MODAL 1: ROL & YETKİ MATRİSİ DÜZENLEME */}
      {/* ========================================================================= */}
      {roleModalUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-xl border border-border bg-card p-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-border/80 pb-3">
              <div>
                <h3 className="text-base font-semibold text-foreground">
                  Rol & Granüler Yetki Matrisi
                </h3>
                <p className="text-xs text-muted-foreground">
                  Kullanıcı: <strong className="text-foreground">{roleModalUser.displayName}</strong> (@{roleModalUser.username})
                </p>
              </div>
              <button
                onClick={() => setRoleModalUser(null)}
                className="rounded p-1 text-muted-foreground hover:bg-muted"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="mt-4 flex flex-col gap-4">
              {/* Role Selection */}
              <div>
                <label className="text-xs font-semibold text-foreground">Kullanıcı Rolü</label>
                <div className="mt-1.5 grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {(Object.keys(ROLE_DEFINITIONS) as UserRole[]).map((r) => {
                    const def = ROLE_DEFINITIONS[r]
                    const isSelected = selectedRole === r
                    return (
                      <button
                        key={r}
                        type="button"
                        onClick={() => handleRoleChange(r)}
                        className={`rounded-lg border p-2.5 text-left transition ${
                          isSelected
                            ? "border-primary bg-primary/10 shadow-sm"
                            : "border-border/70 bg-background/50 hover:border-border"
                        }`}
                      >
                        <div className="text-xs font-bold text-foreground">{def.label}</div>
                        <div className="text-[10px] text-muted-foreground mt-0.5 line-clamp-1">
                          {def.description}
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Granular Permission Toggles */}
              <div>
                <label className="text-xs font-semibold text-foreground">
                  Granüler İzinler & Özel Yetkiler
                </label>
                <p className="text-[11px] text-muted-foreground mb-2">
                  Seçilen role ek olarak bu kullanıcıya özel izinleri açıp kapatabilirsiniz.
                </p>

                <div className="grid grid-cols-1 gap-2 rounded-lg border border-border/70 bg-background/40 p-3 max-h-56 overflow-y-auto sm:grid-cols-2">
                  {(Object.keys(PERMISSION_LABELS) as PermissionKey[]).map((pKey) => {
                    const info = PERMISSION_LABELS[pKey]
                    const isChecked = !!customPermissions[pKey]
                    return (
                      <div
                        key={pKey}
                        className="flex items-center justify-between gap-2 rounded-md border border-border/50 bg-card/60 p-2"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-medium text-foreground">{info.label}</div>
                          <div className="text-[10px] text-muted-foreground line-clamp-1">
                            {info.desc}
                          </div>
                        </div>
                        <Switch
                          checked={isChecked}
                          onCheckedChange={() => toggleCustomPermission(pKey)}
                        />
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>

            <div className="mt-5 flex justify-end gap-2 border-t border-border/80 pt-3">
              <Button size="sm" variant="outline" onClick={() => setRoleModalUser(null)}>
                İptal
              </Button>
              <Button size="sm" disabled={pending} onClick={saveRoleAndPermissions}>
                Değişiklikleri Kaydet
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: CEZA & ASKIYA ALMA SİSTEMİ */}
      {/* ========================================================================= */}
      {penaltyModalUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-xl border border-border bg-card p-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-border/80 pb-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="size-4 text-red-400" />
                <h3 className="text-sm font-semibold text-foreground">Ceza & Askıya Alma</h3>
              </div>
              <button
                onClick={() => setPenaltyModalUser(null)}
                className="rounded p-1 text-muted-foreground hover:bg-muted"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="mt-3 text-xs text-muted-foreground">
              Hedef Kullanıcı: <strong className="text-foreground">{penaltyModalUser.displayName}</strong> (@{penaltyModalUser.username})
            </div>

            <div className="mt-4 flex flex-col gap-3">
              {/* Penalty Action Type */}
              <div>
                <label className="text-xs font-semibold text-foreground">Ceza Türü</label>
                <select
                  value={penaltyType}
                  onChange={(e) => setPenaltyType(e.target.value as any)}
                  className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-xs"
                >
                  <option value="mute">Yalnızca Okuma Modu (Mute / Susturma)</option>
                  <option value="ban">Hesap Banı (Giriş & Erişim Engeli)</option>
                  <option value="shadowban">Shadowban (Gizli İleti İzolasyonu)</option>
                  <option value="warn">Resmi Uyarı (Sicil Kaydı)</option>
                </select>
              </div>

              {/* Duration */}
              <div>
                <label className="text-xs font-semibold text-foreground">Ceza Süresi</label>
                <select
                  value={penaltyDurationHours === null ? "permanent" : penaltyDurationHours}
                  onChange={(e) =>
                    setPenaltyDurationHours(e.target.value === "permanent" ? null : Number(e.target.value))
                  }
                  className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-xs"
                >
                  <option value="1">1 Saat</option>
                  <option value="24">24 Saat (1 Gün)</option>
                  <option value="72">3 Gün</option>
                  <option value="168">7 Gün (1 Hafta)</option>
                  <option value="720">30 Gün (1 Ay)</option>
                  <option value="permanent">Süresiz (Kalıcı)</option>
                </select>
              </div>

              {/* Reason */}
              <div>
                <label className="text-xs font-semibold text-foreground">
                  Gerekçe <span className="text-red-400">*</span>
                </label>
                <Input
                  value={penaltyReason}
                  onChange={(e) => setPenaltyReason(e.target.value)}
                  placeholder="Örn: Hakaret içerikli yorum ve spam link paylaşımı"
                  className="mt-1 text-xs"
                  required
                />
              </div>
            </div>

            <div className="mt-5 flex justify-end gap-2 border-t border-border/80 pt-3">
              <Button size="sm" variant="outline" onClick={() => setPenaltyModalUser(null)}>
                İptal
              </Button>
              <Button
                size="sm"
                variant="destructive"
                disabled={pending || !penaltyReason.trim()}
                onClick={submitPenalty}
              >
                Cezayı Uygula
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: KULLANICI İNCELEME KARTI (USER REVIEW DOSSIER) */}
      {/* ========================================================================= */}
      {inspectUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-2xl rounded-xl border border-border bg-card p-5 shadow-2xl max-h-[90vh] overflow-y-auto">
            {/* Dossier Header */}
            <div className="flex items-start justify-between border-b border-border/80 pb-4">
              <div className="flex items-center gap-3">
                <Avatar className="size-12 rounded-lg border">
                  <AvatarImage src={inspectUser.profile.avatarUrl || ""} />
                  <AvatarFallback className="text-sm font-bold">
                    {inspectUser.profile.displayName.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-bold text-foreground">
                      {inspectUser.profile.displayName}
                    </h2>
                    <Badge variant="outline" className="text-xs">
                      @{inspectUser.profile.username}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Kayıt: {timeAgo(inspectUser.profile.createdAt)} · Seviye {inspectUser.profile.level} · {inspectUser.profile.karma} Karma
                  </p>
                </div>
              </div>

              <button
                onClick={() => setInspectUser(null)}
                className="rounded p-1 text-muted-foreground hover:bg-muted"
              >
                <X className="size-4" />
              </button>
            </div>

            {/* Dossier Sections */}
            <div className="mt-4 flex flex-col gap-4 text-xs">
              {/* Bio & Status */}
              <div className="rounded-lg border border-border/70 bg-background/50 p-3">
                <div className="font-semibold text-foreground mb-1">Hakkında / Biyografi:</div>
                <p className="text-muted-foreground italic">
                  {inspectUser.profile.bio || "Biyografi eklenmemiş."}
                </p>
              </div>

              {/* Ceza Geçmişi */}
              <div>
                <h4 className="font-bold text-foreground mb-2 flex items-center gap-1.5">
                  <AlertTriangle className="size-3.5 text-amber-400" />
                  Ceza ve Uyarı Geçmişi ({inspectUser.penalties.length})
                </h4>
                {inspectUser.penalties.length === 0 ? (
                  <div className="rounded-md border border-border/50 bg-background/40 p-2.5 text-muted-foreground">
                    Kullanıcının geçmişinde herhangi bir ceza veya uyarı kaydı bulunmuyor.
                  </div>
                ) : (
                  <div className="flex flex-col gap-1.5 max-h-36 overflow-y-auto">
                    {inspectUser.penalties.map((pen: any) => (
                      <div
                        key={pen.id}
                        className="flex items-center justify-between rounded-md border border-border/60 bg-background/60 p-2 text-xs"
                      >
                        <div>
                          <span className="font-bold uppercase text-red-400">[{pen.actionType}]</span>{" "}
                          <span>{pen.reason}</span>
                          <div className="text-[10px] text-muted-foreground mt-0.5">
                            Moderatör: {pen.moderatorName || "Sistem"} · {timeAgo(pen.createdAt)}
                          </div>
                        </div>
                        {pen.isActive && (
                          <Badge variant="destructive" className="text-[9px]">Aktif</Badge>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Aldığı Şikayetler */}
              <div>
                <h4 className="font-bold text-foreground mb-2 flex items-center gap-1.5">
                  <ShieldAlert className="size-3.5 text-red-400" />
                  Kullanıcıya veya İçeriklerine Yapılan Şikayetler ({inspectUser.reports.length})
                </h4>
                {inspectUser.reports.length === 0 ? (
                  <div className="rounded-md border border-border/50 bg-background/40 p-2.5 text-muted-foreground">
                    Bu kullanıcıya karşı açık veya çözülmüş şikayet bulunmuyor.
                  </div>
                ) : (
                  <div className="flex flex-col gap-1.5 max-h-36 overflow-y-auto">
                    {inspectUser.reports.map((rep: any) => (
                      <div
                        key={rep.id}
                        className="rounded-md border border-border/60 bg-background/60 p-2 text-xs"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-foreground">Tür: {rep.targetType}</span>
                          <span className="text-[10px] text-muted-foreground">{timeAgo(rep.createdAt)}</span>
                        </div>
                        <p className="mt-0.5 text-muted-foreground">{rep.reason}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Açtığı Son Konular */}
              <div>
                <h4 className="font-bold text-foreground mb-2 flex items-center gap-1.5">
                  <MessageSquare className="size-3.5 text-cyan-400" />
                  Açtığı Son Konular ({inspectUser.topics.length})
                </h4>
                {inspectUser.topics.length === 0 ? (
                  <div className="rounded-md border border-border/50 bg-background/40 p-2.5 text-muted-foreground">
                    Henüz açılmış konu yok.
                  </div>
                ) : (
                  <div className="flex flex-col gap-1 max-h-36 overflow-y-auto">
                    {inspectUser.topics.map((top: any) => (
                      <Link
                        key={top.id}
                        href={`/konu/${top.slug}`}
                        target="_blank"
                        className="flex items-center justify-between rounded border border-border/40 bg-background/40 p-1.5 hover:bg-muted/40 transition"
                      >
                        <span className="truncate max-w-sm font-medium text-foreground">
                          {top.title}
                        </span>
                        <span className="text-[10px] text-muted-foreground shrink-0">
                          {top.commentCount} yorum · {timeAgo(top.createdAt)}
                        </span>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="mt-5 flex justify-end border-t border-border/80 pt-3">
              <Button size="sm" onClick={() => setInspectUser(null)}>
                Kapat
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

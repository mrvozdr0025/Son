"use client"

import { useTransition } from "react"
import Link from "next/link"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { setUserAdmin, setUserBanned } from "@/app/actions/admin"
import { timeAgo } from "@/lib/format"

type UserRow = {
  id: number
  username: string
  displayName: string
  karma: number
  level: number
  isAdmin: boolean
  isBanned: boolean
  createdAt: Date
}

export function UserAdminTable({ users }: { users: UserRow[] }) {
  const [pending, startTransition] = useTransition()

  if (users.length === 0) {
    return (
      <Card className="p-8 text-center text-sm text-muted-foreground">
        Henüz gerçek üye yok. İlk kayıt olan kullanıcı burada görünür.
      </Card>
    )
  }

  return (
    <Card className="overflow-x-auto p-0">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left text-xs text-muted-foreground">
            <th className="p-3 font-medium">Kullanıcı</th>
            <th className="p-3 font-medium">Karma</th>
            <th className="p-3 font-medium">Seviye</th>
            <th className="p-3 font-medium">Kayıt</th>
            <th className="p-3 font-medium">Durum</th>
            <th className="p-3 font-medium text-right">İşlem</th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.id} className="border-b border-border last:border-0">
              <td className="p-3">
                <Link href={`/profil/${u.username}`} className="font-medium hover:text-primary">
                  {u.displayName}
                </Link>
                <span className="block text-xs text-muted-foreground">@{u.username}</span>
              </td>
              <td className="p-3">{u.karma}</td>
              <td className="p-3">{u.level}</td>
              <td className="p-3 text-xs text-muted-foreground">{timeAgo(u.createdAt)}</td>
              <td className="p-3">
                <div className="flex gap-1">
                  {u.isAdmin && <Badge variant="secondary">Admin</Badge>}
                  {u.isBanned && <Badge variant="destructive">Banlı</Badge>}
                  {!u.isAdmin && !u.isBanned && (
                    <Badge variant="outline" className="text-muted-foreground">
                      Üye
                    </Badge>
                  )}
                </div>
              </td>
              <td className="p-3 text-right">
                <div className="flex justify-end gap-1.5">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={pending}
                    onClick={() => startTransition(() => setUserBanned(u.id, !u.isBanned))}
                  >
                    {u.isBanned ? "Banı Kaldır" : "Banla"}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={pending}
                    onClick={() => startTransition(() => setUserAdmin(u.id, !u.isAdmin))}
                  >
                    {u.isAdmin ? "Admin Al" : "Admin Yap"}
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  )
}

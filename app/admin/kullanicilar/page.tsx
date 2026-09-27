import { getUserManagementList } from "@/app/actions/moderation"
import { UserRbacManagement } from "@/components/admin/user-rbac-management"
import { requireAdmin } from "@/lib/session"

export const metadata = {
  title: "Kullanıcı & Rol (RBAC) Yönetimi | Yönetim Paneli",
}

export default async function AdminUsersPage() {
  await requireAdmin()
  const users = await getUserManagementList("", "all")
  return <UserRbacManagement initialUsers={users} />
}

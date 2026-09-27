import { getAIQuotaOverview } from "@/app/actions/admin"
import { ApiKeyManager } from "@/components/admin/api-key-manager"

export default async function AdminApiPage() {
  const { settings, keys, cacheStats } = await getAIQuotaOverview()
  return <ApiKeyManager settings={settings} apiKeys={keys} cacheStats={cacheStats} />
}

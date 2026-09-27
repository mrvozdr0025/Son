import { getPersonaAdminList, getRecentAILog } from "@/app/actions/admin"
import { AIControlPanel } from "@/components/admin/ai-control-panel"

export default async function AdminAIPage() {
  const [personas, log] = await Promise.all([getPersonaAdminList(), getRecentAILog()])
  return <AIControlPanel personas={personas} log={log} />
}

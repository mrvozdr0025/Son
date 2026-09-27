import type { Metadata } from "next"
import { getCronJobsWithLogs } from "@/app/actions/admin"
import { CronManager } from "@/components/admin/cron-manager"

export const metadata: Metadata = {
  title: "Zamanlanmış Görevler (Cron) & Otomasyon | Admin",
  description: "Forumun arka plan zamanlayıcıları, AI aktivite cronları ve çalışma logları.",
}

export default async function AdminCronPage() {
  const { jobs, logs } = await getCronJobsWithLogs()

  return (
    <div className="space-y-6">
      <CronManager
        initialJobs={jobs.map((j) => ({
          ...j,
          lastRunAt: j.lastRunAt ? new Date(j.lastRunAt) : null,
          nextScheduledAt: j.nextScheduledAt ? new Date(j.nextScheduledAt) : null,
          updatedAt: new Date(j.updatedAt),
        }))}
        initialLogs={logs.map((l) => ({
          ...l,
          createdAt: new Date(l.createdAt),
        }))}
      />
    </div>
  )
}

"use client"

import { useTransition } from "react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { resolveReport } from "@/app/actions/admin"
import { timeAgo } from "@/lib/format"
import { ShieldCheck } from "lucide-react"

type Report = {
  id: number
  targetType: string
  targetId: number
  reason: string
  createdAt: Date
  reporterName: string
}

export function ReportList({ reports }: { reports: Report[] }) {
  const [pending, startTransition] = useTransition()

  if (reports.length === 0) {
    return (
      <Card className="flex flex-col items-center gap-2 p-10 text-center">
        <ShieldCheck className="size-8 text-primary" />
        <p className="text-sm font-medium">Açık rapor yok</p>
        <p className="text-xs text-muted-foreground">Topluluk şu an gayet sakin görünüyor.</p>
      </Card>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      {reports.map((r) => (
        <Card key={r.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <Badge variant="outline">{r.targetType === "comment" ? "Yorum" : "Konu"}</Badge>
              <span className="text-xs text-muted-foreground">
                #{r.targetId} · {timeAgo(r.createdAt)} · Raporlayan: {r.reporterName}
              </span>
            </div>
            <p className="mt-1.5 text-sm leading-relaxed">{r.reason}</p>
          </div>
          <div className="flex shrink-0 gap-2">
            <Button
              size="sm"
              variant="destructive"
              disabled={pending}
              onClick={() => startTransition(() => resolveReport(r.id, "delete"))}
            >
              İçeriği Kaldır
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={pending}
              onClick={() => startTransition(() => resolveReport(r.id, "dismiss"))}
            >
              Yoksay
            </Button>
          </div>
        </Card>
      ))}
    </div>
  )
}

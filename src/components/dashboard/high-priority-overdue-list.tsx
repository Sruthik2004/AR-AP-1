import Link from "next/link"

import { Badge } from "@/components/ui/badge"
import { formatINR } from "@/lib/currency"
import type { OverviewData } from "@/lib/dashboard/queries"

type HighPriorityOverdueListProps = {
  items: OverviewData["highPriorityItems"]
}

export function HighPriorityOverdueList({
  items,
}: HighPriorityOverdueListProps) {
  return (
    <div className="rounded-xl border bg-card">
      <div className="flex items-center justify-between gap-3 border-b px-4 py-3">
        <div>
          <h2 className="text-sm font-medium">High-priority overdue</h2>
          <p className="text-xs text-muted-foreground">
            Open AR/AP items more than 60 days past due.
          </p>
        </div>
        <Link
          href="/dashboard/audit"
          className="text-xs font-medium underline-offset-4 hover:underline"
        >
          View audit trail
        </Link>
      </div>

      {items.length === 0 ? (
        <div className="px-4 py-8 text-center text-sm text-muted-foreground">
          No high-priority overdue items.
        </div>
      ) : (
        <ul className="divide-y">
          {items.map((item) => (
            <li
              key={`${item.kind}-${item.id}`}
              className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{item.reference}</span>
                  <Badge variant="outline">
                    {item.kind === "invoice" ? "AR" : "AP"}
                  </Badge>
                  <Badge variant="destructive">{item.daysPastDue}d overdue</Badge>
                </div>
                <p className="text-sm text-muted-foreground">{item.partyName}</p>
              </div>
              <p className="font-medium tabular-nums">
                {formatINR(item.balanceDue)}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

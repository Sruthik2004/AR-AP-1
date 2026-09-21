import Link from "next/link"
import { FileText, Receipt, Shield, UserRound } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import type { AuditLogItem } from "@/lib/dashboard/queries"

type AuditTrailFeedProps = {
  logs: AuditLogItem[]
  error?: string | null
  compact?: boolean
}

function formatAction(action: string) {
  return action.replace(/\./g, " · ").replace(/_/g, " ")
}

function entityIcon(entity: string) {
  const value = entity.toLowerCase()
  if (value.includes("invoice")) return Receipt
  if (value.includes("bill") || value.includes("approval")) return FileText
  if (value.includes("contact") || value.includes("user")) return UserRound
  return Shield
}

function formatTimestamp(value: string) {
  try {
    return new Intl.DateTimeFormat("en-IN", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value))
  } catch {
    return value
  }
}

export function AuditTrailFeed({
  logs,
  error,
  compact = false,
}: AuditTrailFeedProps) {
  return (
    <div className="rounded-xl border bg-card">
      <div className="flex items-center justify-between gap-3 border-b px-4 py-3">
        <div>
          <h2 className="text-sm font-medium">
            {compact ? "Recent activity" : "Organization audit trail"}
          </h2>
          <p className="text-xs text-muted-foreground">
            Who changed invoices, bills, and related records — and when.
          </p>
        </div>
        {compact ? (
          <Link
            href="/dashboard/audit"
            className="text-xs font-medium underline-offset-4 hover:underline"
          >
            Open full feed
          </Link>
        ) : null}
      </div>

      {error ? (
        <div className="m-4 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-800 dark:text-amber-200">
          {error}
        </div>
      ) : null}

      {logs.length === 0 && !error ? (
        <div className="px-4 py-8 text-center text-sm text-muted-foreground">
          No audit events yet. Create invoices, bills, or contacts to populate
          this feed.
        </div>
      ) : (
        <ul className="divide-y">
          {logs.map((log) => {
            const Icon = entityIcon(log.entity)
            return (
              <li key={log.id} className="flex gap-3 px-4 py-3">
                <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted">
                  <Icon className="size-4 text-muted-foreground" />
                </div>
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-medium capitalize">
                      {formatAction(log.action)}
                    </p>
                    <Badge variant="secondary">{log.entity}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {log.user?.email ?? "System / unknown user"}
                    {log.user?.role ? ` · ${log.user.role}` : ""}
                    {log.entity_id
                      ? ` · record ${log.entity_id.slice(0, 8)}…`
                      : ""}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatTimestamp(log.created_at)}
                  </p>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

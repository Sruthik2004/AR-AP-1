import type { Metadata } from "next"

import { AuditTrailFeed } from "@/components/dashboard/audit-trail-feed"
import { PageShell } from "@/components/layout/page-shell"
import { getAuditTrail } from "@/lib/dashboard/queries"

export const metadata: Metadata = {
  title: "Audit Trail",
}

export default async function DashboardAuditPage() {
  const { logs, error } = await getAuditTrail(100)

  return (
    <PageShell
      title="Audit trail"
      description="Real-time organization actions for financial compliance — who changed invoices and bills, and when."
    >
      <AuditTrailFeed logs={logs} error={error} />
    </PageShell>
  )
}

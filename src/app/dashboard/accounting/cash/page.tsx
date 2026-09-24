import type { Metadata } from "next"

import { AccountingNav } from "@/components/accounting/accounting-nav"
import { PageShell } from "@/components/layout/page-shell"
import { getLedger } from "@/lib/accounting/queries"
import { bankMovement } from "@/lib/accounting/statements"
import { formatINR } from "@/lib/currency"

export const metadata: Metadata = { title: "Cash" }

export default async function CashPage() {
  const { rows, error } = await getLedger()
  const cash = bankMovement(rows)

  return (
    <PageShell
      title="Cash"
      description="Movement in the Bank account (110000) from posted journals. A full operating, investing, and financing split comes with later modules."
    >
      <AccountingNav />
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <dl className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border px-4 py-3">
          <dt className="text-sm text-muted-foreground">Cash in</dt>
          <dd className="text-lg font-medium tabular-nums">{formatINR(cash.cashIn)}</dd>
        </div>
        <div className="rounded-xl border px-4 py-3">
          <dt className="text-sm text-muted-foreground">Cash out</dt>
          <dd className="text-lg font-medium tabular-nums">{formatINR(cash.cashOut)}</dd>
        </div>
        <div className="rounded-xl border px-4 py-3">
          <dt className="text-sm text-muted-foreground">Net change</dt>
          <dd className="text-lg font-medium tabular-nums">{formatINR(cash.net)}</dd>
        </div>
      </dl>
    </PageShell>
  )
}

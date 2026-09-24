import type { Metadata } from "next"

import { AccountingNav } from "@/components/accounting/accounting-nav"
import { MoneyTable } from "@/components/accounting/money-table"
import { PageShell } from "@/components/layout/page-shell"
import { getLedger } from "@/lib/accounting/queries"
import { trialBalanceTotals } from "@/lib/accounting/statements"
import { formatINR } from "@/lib/currency"

export const metadata: Metadata = { title: "Trial balance" }

export default async function TrialBalancePage() {
  const { rows, error } = await getLedger()
  const totals = trialBalanceTotals(rows)

  return (
    <PageShell
      title="Trial balance"
      description="Account totals from posted journals. The debit column equals the credit column."
    >
      <AccountingNav />
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <MoneyTable
        columns={["Code", "Account", "Debit", "Credit"]}
        rows={[
          ...rows.map((row) => [row.code, row.name, row.debit, row.credit]),
          ...(rows.length
            ? [["", "Total", totals.debit, totals.credit] as (string | number)[]]
            : []),
        ]}
        empty="No posted journals yet, so the trial balance is empty."
      />
      {rows.length > 0 ? (
        <p className="text-sm text-muted-foreground">
          {totals.debit === totals.credit
            ? `In balance at ${formatINR(totals.debit)}.`
            : `Out of balance: debits ${formatINR(totals.debit)}, credits ${formatINR(totals.credit)}.`}
        </p>
      ) : null}
    </PageShell>
  )
}

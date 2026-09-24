import type { Metadata } from "next"
import Link from "next/link"

import { AccountingNav } from "@/components/accounting/accounting-nav"
import { MoneyTable } from "@/components/accounting/money-table"
import { PageShell } from "@/components/layout/page-shell"
import { JOURNAL_SOURCE_LABEL } from "@/lib/accounting/codes"
import { getJournals } from "@/lib/accounting/queries"
import { Button } from "@/components/ui/button"

export const metadata: Metadata = { title: "Journals" }

export default async function JournalsPage() {
  const { rows, error } = await getJournals()

  return (
    <PageShell
      title="Journals"
      description="Posted journals are the general ledger. Debits and credits on each journal are equal."
    >
      <AccountingNav />
      <Button asChild className="w-fit">
        <Link href="/dashboard/accounting/journals/new">New journal</Link>
      </Button>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <MoneyTable
        columns={["Number", "Date", "Source", "Description", "Debit", "Credit"]}
        rows={rows.map((row) => [
          row.journalNumber,
          row.postingDate,
          JOURNAL_SOURCE_LABEL[row.source],
          row.description,
          row.debit,
          row.credit,
        ])}
        empty="No journals yet. Approve a vendor bill, send a customer invoice, or post a manual journal."
      />
    </PageShell>
  )
}

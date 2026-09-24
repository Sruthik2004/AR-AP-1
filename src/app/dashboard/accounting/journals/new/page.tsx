import type { Metadata } from "next"

import { ManualJournalForm } from "@/components/accounting/manual-journal-form"
import { AccountingNav } from "@/components/accounting/accounting-nav"
import { PageShell } from "@/components/layout/page-shell"
import { getAccounts } from "@/lib/accounting/queries"

export const metadata: Metadata = { title: "New journal" }

export default async function NewJournalPage() {
  const { rows, error } = await getAccounts()

  return (
    <PageShell
      title="New journal"
      description="Post a balanced entry, such as rent: debit Operating Expenses, credit Bank."
    >
      <AccountingNav />
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {rows.length > 0 ? <ManualJournalForm accounts={rows} /> : null}
    </PageShell>
  )
}

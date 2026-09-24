import type { Metadata } from "next"

import { AccountingNav } from "@/components/accounting/accounting-nav"
import { MoneyTable } from "@/components/accounting/money-table"
import { PageShell } from "@/components/layout/page-shell"
import { getAccounts } from "@/lib/accounting/queries"

export const metadata: Metadata = { title: "Chart of accounts" }

export default async function ChartOfAccountsPage() {
  const { rows, error } = await getAccounts()

  return (
    <PageShell
      title="Chart of accounts"
      description="The account list every journal posts to. Group rows are headings and cannot be used on a journal line."
    >
      <AccountingNav />
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <MoneyTable
        columns={["Code", "Account", "Type", "Use"]}
        rows={rows.map((row) => [
          row.code,
          row.name,
          row.accountType,
          row.isGroup ? "Group" : "Posting",
        ])}
        empty="No accounts yet. Apply the accounting migration so each organization receives a chart of accounts."
      />
    </PageShell>
  )
}

import type { Metadata } from "next"

import { AccountingNav } from "@/components/accounting/accounting-nav"
import { MoneyTable } from "@/components/accounting/money-table"
import { PageShell } from "@/components/layout/page-shell"
import { getTaxCodes } from "@/lib/accounting/queries"

export const metadata: Metadata = { title: "Tax master" }

export default async function TaxMasterPage() {
  const { rows, error } = await getTaxCodes()

  return (
    <PageShell
      title="Tax master"
      description="GST rates used when a bill or invoice is split into net amount and tax."
    >
      <AccountingNav />
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <MoneyTable
        columns={["Name", "Rate"]}
        rows={rows.map((row) => [row.name, row.rate])}
        empty="No tax codes yet."
      />
    </PageShell>
  )
}

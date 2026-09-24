import type { Metadata } from "next"

import { AccountingNav } from "@/components/accounting/accounting-nav"
import { MoneyTable } from "@/components/accounting/money-table"
import { PageShell } from "@/components/layout/page-shell"
import { getLedger } from "@/lib/accounting/queries"
import { balanceSheet } from "@/lib/accounting/statements"
import { formatINR } from "@/lib/currency"

export const metadata: Metadata = { title: "Balance sheet" }

export default async function BalanceSheetPage() {
  const { rows, error } = await getLedger()
  const statement = balanceSheet(rows)

  return (
    <PageShell
      title="Balance sheet"
      description="Assets equal liabilities plus equity. Current profit is included in equity until it is closed into retained earnings."
    >
      <AccountingNav />
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-medium">Assets</h2>
        <MoneyTable
          columns={["Code", "Account", "Amount"]}
          rows={statement.assets.map((row) => [row.code, row.name, row.amount])}
          empty="No asset balances."
        />
      </section>
      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-medium">Liabilities</h2>
        <MoneyTable
          columns={["Code", "Account", "Amount"]}
          rows={statement.liabilities.map((row) => [row.code, row.name, row.amount])}
          empty="No liability balances."
        />
      </section>
      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-medium">Equity</h2>
        <MoneyTable
          columns={["Code", "Account", "Amount"]}
          rows={
            rows.length
              ? [
                  ...statement.equity.map(
                    (row) => [row.code, row.name, row.amount] as (string | number)[]
                  ),
                  ["", "Current period earnings", statement.earnings],
                ]
              : []
          }
          empty="No equity balances."
        />
      </section>
      <p className="text-sm">
        Assets {formatINR(statement.totalAssets)} · Liabilities and equity{" "}
        {formatINR(statement.totalLiabilitiesAndEquity)}
      </p>
    </PageShell>
  )
}

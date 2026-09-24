import type { Metadata } from "next"

import { AccountingNav } from "@/components/accounting/accounting-nav"
import { MoneyTable } from "@/components/accounting/money-table"
import { PageShell } from "@/components/layout/page-shell"
import { getLedger } from "@/lib/accounting/queries"
import { profitAndLoss } from "@/lib/accounting/statements"
import { formatINR } from "@/lib/currency"

export const metadata: Metadata = { title: "Profit and loss" }

export default async function ProfitAndLossPage() {
  const { rows, error } = await getLedger()
  const statement = profitAndLoss(rows)

  return (
    <PageShell
      title="Profit and loss"
      description="Revenue minus expenses, taken from the ledger."
    >
      <AccountingNav />
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-medium">Revenue</h2>
        <MoneyTable
          columns={["Code", "Account", "Amount"]}
          rows={statement.revenue.map((row) => [row.code, row.name, row.amount])}
          empty="No revenue posted."
        />
      </section>
      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-medium">Expenses</h2>
        <MoneyTable
          columns={["Code", "Account", "Amount"]}
          rows={statement.expenses.map((row) => [row.code, row.name, row.amount])}
          empty="No expenses posted."
        />
      </section>
      <p className="text-sm">
        Revenue {formatINR(statement.totalRevenue)} − Expenses{" "}
        {formatINR(statement.totalExpenses)} = Net profit {formatINR(statement.netProfit)}
      </p>
    </PageShell>
  )
}

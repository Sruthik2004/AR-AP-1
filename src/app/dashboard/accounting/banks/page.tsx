import type { Metadata } from "next"

import { AccountingNav } from "@/components/accounting/accounting-nav"
import { MoneyTable } from "@/components/accounting/money-table"
import { PageShell } from "@/components/layout/page-shell"
import { getBankAccounts } from "@/lib/accounting/queries"

export const metadata: Metadata = { title: "Bank master" }

export default async function BankMasterPage() {
  const { rows, error } = await getBankAccounts()

  return (
    <PageShell
      title="Bank master"
      description="Payments credit or debit the ledger account linked to the bank."
    >
      <AccountingNav />
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <MoneyTable
        columns={["Name", "Bank", "Account number", "IFSC", "Currency", "Ledger account"]}
        rows={rows.map((row) => [
          row.name,
          row.bankName,
          row.accountNumber,
          row.ifsc,
          row.currency,
          row.glCode ? `${row.glCode} ${row.glName}` : null,
        ])}
        empty="No bank account yet."
      />
    </PageShell>
  )
}

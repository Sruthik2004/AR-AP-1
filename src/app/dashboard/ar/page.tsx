import type { Metadata } from "next"

import { InvoicesDataTable } from "@/components/ar/invoices-data-table"
import { PageShell } from "@/components/layout/page-shell"
import { getInvoices } from "@/lib/ar/queries"

export const metadata: Metadata = {
  title: "Accounts Receivable",
}

export default async function AccountsReceivablePage() {
  const { invoices, error } = await getInvoices()

  return (
    <PageShell
      title="Accounts Receivable (AR)"
      description="Track customer invoices, balances due, and collection progress."
    >
      <InvoicesDataTable data={invoices} error={error} />
    </PageShell>
  )
}

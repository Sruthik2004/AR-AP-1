import type { Metadata } from "next"

import { BillsDataTable } from "@/components/ap/bills-data-table"
import { PageShell } from "@/components/layout/page-shell"
import { getBills } from "@/lib/ap/queries"

export const metadata: Metadata = {
  title: "Accounts Payable",
}

export default async function AccountsPayablePage() {
  const { bills, error } = await getBills()

  return (
    <PageShell
      title="Accounts Payable (AP)"
      description="Track vendor bills, attachments, and approval status."
    >
      <BillsDataTable data={bills} error={error} />
    </PageShell>
  )
}

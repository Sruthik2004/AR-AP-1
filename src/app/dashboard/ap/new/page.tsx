import type { Metadata } from "next"

import { BillCreateForm } from "@/components/ap/bill-create-form"
import { PageShell } from "@/components/layout/page-shell"
import { getVendorOptions } from "@/lib/ap/queries"

export const metadata: Metadata = {
  title: "New Bill",
}

export default async function NewBillPage() {
  const { vendors, error } = await getVendorOptions()

  return (
    <PageShell
      title="Create bill"
      description="Capture vendor invoices with uploads, line items, and approval routing."
    >
      <BillCreateForm vendors={vendors} vendorsError={error} />
    </PageShell>
  )
}

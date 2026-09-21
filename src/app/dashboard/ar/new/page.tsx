import type { Metadata } from "next"

import { InvoiceCreateForm } from "@/components/ar/invoice-create-form"
import { PageShell } from "@/components/layout/page-shell"
import { getCustomerOptions } from "@/lib/ar/queries"

export const metadata: Metadata = {
  title: "New Invoice",
}

export default async function NewInvoicePage() {
  const { customers, error } = await getCustomerOptions()

  return (
    <PageShell
      title="Create invoice"
      description="Build a multi-line customer invoice with GST and automatic totals."
    >
      <InvoiceCreateForm customers={customers} customersError={error} />
    </PageShell>
  )
}

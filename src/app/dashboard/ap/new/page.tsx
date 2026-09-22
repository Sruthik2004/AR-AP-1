import type { Metadata } from "next"

import { BillCreateForm } from "@/components/ap/bill-create-form"
import { PageShell } from "@/components/layout/page-shell"
import { getVendorOptions } from "@/lib/ap/queries"

export const metadata: Metadata = {
  title: "New Bill",
}

export const maxDuration = 60

export default async function NewBillPage() {
  const { vendors, error } = await getVendorOptions()

  return (
    <PageShell
      title="Create bill"
      description="Upload a vendor bill. OCR fills vendor, due date, items, and total. Review before submitting."
    >
      <BillCreateForm vendors={vendors} vendorsError={error} />
    </PageShell>
  )
}

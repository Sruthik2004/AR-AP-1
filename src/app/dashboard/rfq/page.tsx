import type { Metadata } from "next"

import { RfqBoard } from "@/components/rfq/rfq-board"
import { PageShell } from "@/components/layout/page-shell"
import { getRfqs } from "@/lib/rfq/queries"

export const metadata: Metadata = {
  title: "Request for Quotation",
}

export default async function RfqPage() {
  const { rfqs, error } = await getRfqs()

  return (
    <PageShell
      title="Request for quotation"
      description="Obtain quotes from more than one vendor, then select the lowest before creating a bill."
    >
      <RfqBoard rfqs={rfqs} error={error} />
    </PageShell>
  )
}

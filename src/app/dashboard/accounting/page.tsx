import type { Metadata } from "next"
import Link from "next/link"

import { AccountingNav } from "@/components/accounting/accounting-nav"
import { PageShell } from "@/components/layout/page-shell"

export const metadata: Metadata = { title: "Accounting" }

const layers = [
  {
    title: "Master data",
    detail: "Chart of accounts, tax codes, and the bank account. Vendors and customers already live in Contacts.",
    href: "/dashboard/accounting/accounts",
  },
  {
    title: "Transactions",
    detail: "Customer invoices and vendor bills stay where they are. Approving a bill or sending an invoice now creates a journal.",
    href: "/dashboard/ap",
  },
  {
    title: "Accounting engine",
    detail: "Every journal must balance: total debit equals total credit. You can also post a manual journal, such as rent.",
    href: "/dashboard/accounting/journals",
  },
  {
    title: "General ledger",
    detail: "Posted journals are the ledger. A bill or invoice is not edited inside the ledger; it is the source of the journal.",
    href: "/dashboard/accounting/journals",
  },
  {
    title: "Reporting",
    detail: "Trial balance, profit and loss, balance sheet, and cash movement are calculated from the ledger.",
    href: "/dashboard/accounting/trial-balance",
  },
]

export default function AccountingPage() {
  return (
    <PageShell
      title="Accounting"
      description="Business transactions post into the ledger. Reports are read from the ledger."
    >
      <AccountingNav />
      <ol className="grid gap-3">
        {layers.map((layer, index) => (
          <li key={layer.title}>
            <Link
              href={layer.href}
              className="grid gap-1 rounded-xl border px-4 py-3 transition-colors hover:bg-muted/40"
            >
              <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                {index + 1}. {layer.title}
              </span>
              <span className="text-sm">{layer.detail}</span>
            </Link>
          </li>
        ))}
      </ol>
    </PageShell>
  )
}

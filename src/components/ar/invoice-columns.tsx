"use client"

import type { LegacyColumnDef } from "@tanstack/react-table/legacy"

import { InvoiceStatusBadge } from "@/components/ar/invoice-status-badge"
import { PaymentProgress } from "@/components/ar/payment-progress"
import { RecordPaymentSheet } from "@/components/ar/record-payment-sheet"
import { formatINR } from "@/lib/currency"
import type { InvoiceListItem } from "@/types/invoices"

export const invoiceColumns: LegacyColumnDef<InvoiceListItem>[] = [
  {
    accessorKey: "invoice_number",
    header: "Invoice #",
    cell: ({ row }) => (
      <div className="font-medium">{row.original.invoice_number}</div>
    ),
  },
  {
    id: "customer",
    accessorFn: (row) => row.customer?.name ?? "",
    header: "Customer",
    cell: ({ row }) => (
      <div>
        <div className="font-medium">{row.original.customer?.name ?? "—"}</div>
        <div className="text-xs text-muted-foreground">
          {row.original.customer?.email ?? ""}
        </div>
      </div>
    ),
  },
  {
    accessorKey: "issue_date",
    header: "Issue date",
    cell: ({ row }) => (
      <span className="tabular-nums text-muted-foreground">
        {row.original.issue_date}
      </span>
    ),
  },
  {
    accessorKey: "due_date",
    header: "Due date",
    cell: ({ row }) => (
      <span className="tabular-nums text-muted-foreground">
        {row.original.due_date}
      </span>
    ),
  },
  {
    accessorKey: "status",
    header: "Status",
    filterFn: (row, id, value) => {
      if (!value || value === "all") return true
      return row.getValue(id) === value
    },
    cell: ({ row }) => <InvoiceStatusBadge status={row.original.status} />,
  },
  {
    accessorKey: "total_amount",
    header: "Total",
    cell: ({ row }) => (
      <span className="font-medium tabular-nums">
        {formatINR(row.original.total_amount)}
      </span>
    ),
  },
  {
    accessorKey: "balance_due",
    header: "Balance due",
    cell: ({ row }) => (
      <span className="font-medium tabular-nums">
        {formatINR(row.original.balance_due)}
      </span>
    ),
  },
  {
    id: "progress",
    header: "Payment progress",
    enableGlobalFilter: false,
    cell: ({ row }) => (
      <PaymentProgress
        totalAmount={row.original.total_amount}
        balanceDue={row.original.balance_due}
      />
    ),
  },
  {
    id: "actions",
    header: "",
    enableGlobalFilter: false,
    cell: ({ row }) => (
      <div className="flex justify-end">
        <RecordPaymentSheet invoice={row.original} />
      </div>
    ),
  },
]

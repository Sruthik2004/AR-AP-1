"use client"

import type { LegacyColumnDef } from "@tanstack/react-table/legacy"

import { Badge } from "@/components/ui/badge"
import type { Contact } from "@/types/contacts"

export const contactColumns: LegacyColumnDef<Contact>[] = [
  {
    accessorKey: "name",
    header: "Contact Name",
    cell: ({ row }) => (
      <div className="font-medium">{row.getValue("name")}</div>
    ),
  },
  {
    accessorKey: "type",
    header: "Type",
    filterFn: (row, id, value) => {
      if (!value || value === "all") return true
      return row.getValue(id) === value
    },
    cell: ({ row }) => {
      const type = row.getValue("type") as Contact["type"]
      return (
        <Badge variant={type === "customer" ? "default" : "secondary"}>
          {type === "customer" ? "Customer" : "Vendor"}
        </Badge>
      )
    },
  },
  {
    accessorKey: "email",
    header: "Primary Email",
    cell: ({ row }) => (
      <span className="text-muted-foreground">
        {(row.getValue("email") as string | null) ?? "—"}
      </span>
    ),
  },
  {
    accessorKey: "phone",
    header: "Phone",
    cell: ({ row }) => (
      <span className="text-muted-foreground">
        {(row.getValue("phone") as string | null) ?? "—"}
      </span>
    ),
  },
  {
    accessorKey: "tax_id",
    header: "Tax ID / GSTIN",
    cell: ({ row }) => (
      <span className="font-mono text-xs text-muted-foreground">
        {(row.getValue("tax_id") as string | null) ?? "—"}
      </span>
    ),
  },
  {
    accessorKey: "currency",
    header: "Currency",
    cell: ({ row }) => (
      <span className="tabular-nums">{row.getValue("currency")}</span>
    ),
  },
]

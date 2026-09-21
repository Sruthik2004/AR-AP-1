"use client"

import { Badge } from "@/components/ui/badge"
import type { BillStatus } from "@/types/bills"

const STATUS_LABELS: Record<BillStatus, string> = {
  draft: "Draft",
  pending_approval: "Pending approval",
  approved: "Approved",
  partially_paid: "Partially paid",
  paid: "Paid",
  rejected: "Rejected",
}

const STATUS_VARIANTS: Record<
  BillStatus,
  "default" | "secondary" | "destructive" | "outline"
> = {
  draft: "outline",
  pending_approval: "default",
  approved: "secondary",
  partially_paid: "secondary",
  paid: "secondary",
  rejected: "destructive",
}

export function BillStatusBadge({ status }: { status: BillStatus }) {
  return (
    <Badge variant={STATUS_VARIANTS[status]}>{STATUS_LABELS[status]}</Badge>
  )
}

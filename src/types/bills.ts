import {
  calcLineTotal,
  roundMoney,
  GST_TAX_RATES,
} from "@/types/invoices"

export { calcLineTotal, roundMoney, GST_TAX_RATES }

export type BillStatus =
  | "draft"
  | "pending_approval"
  | "approved"
  | "partially_paid"
  | "paid"
  | "rejected"

export type BillListItem = {
  id: string
  org_id: string
  vendor_id: string
  bill_number: string
  total_amount: number
  balance_due: number
  status: BillStatus
  due_date: string
  attachment_path: string | null
  attachment_name: string | null
  attachment_mime: string | null
  created_at: string
  vendor: {
    id: string
    name: string
    email: string | null
  } | null
}

export type BillLineInput = {
  description: string
  quantity: number
  unit_price: number
  tax_rate: number
  line_total: number
}

/** Bills above this amount require manager/admin approval. */
export const BILL_APPROVAL_THRESHOLD = 1000

export function resolveBillStatusOnSubmit(totalAmount: number): BillStatus {
  return totalAmount > BILL_APPROVAL_THRESHOLD
    ? "pending_approval"
    : "approved"
}

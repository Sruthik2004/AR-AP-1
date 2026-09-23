export type InvoiceStatus =
  | "draft"
  | "sent"
  | "partially_paid"
  | "paid"
  | "overdue"

export type InvoiceListItem = {
  id: string
  org_id: string
  customer_id: string
  invoice_number: string
  total_amount: number
  balance_due: number
  status: InvoiceStatus
  due_date: string
  issue_date: string
  created_at: string
  customer: {
    id: string
    name: string
    email: string | null
  } | null
}

export type InvoiceLineInput = {
  description: string
  quantity: number
  unit_price: number
  tax_rate: number
  line_total: number
}

export type CreateInvoiceInput = {
  customer_id: string
  invoice_number: string
  issue_date: string
  due_date: string
  status: Extract<InvoiceStatus, "draft" | "sent">
  items: InvoiceLineInput[]
  total_amount: number
}

export type RecordInvoicePaymentInput = {
  invoice_id: string
  amount: number
  payment_method: string
  reference_code: string
  paid_at: string
}

export const GST_TAX_RATES = [0, 5, 12, 18, 28] as const

export function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100
}

/** GST on intra-state bills is CGST + SGST, each rounded, then added. */
export function calcTaxAmount(
  quantity: number,
  unitPrice: number,
  taxRate: number
) {
  const subtotal = roundMoney(quantity * unitPrice)
  if (!Number.isFinite(subtotal) || subtotal <= 0 || taxRate <= 0) return 0

  if (taxRate % 2 === 0) {
    const component = roundMoney((subtotal * (taxRate / 2)) / 100)
    return roundMoney(component * 2)
  }

  return roundMoney((subtotal * taxRate) / 100)
}

export function calcLineTotal(
  quantity: number,
  unitPrice: number,
  taxRate: number
) {
  const subtotal = roundMoney(quantity * unitPrice)
  return roundMoney(subtotal + calcTaxAmount(quantity, unitPrice, taxRate))
}

export function calcPaymentProgress(totalAmount: number, balanceDue: number) {
  if (totalAmount <= 0) return 0
  const paid = Math.max(totalAmount - balanceDue, 0)
  return Math.min(100, Math.round((paid / totalAmount) * 100))
}

export function nextInvoiceStatusAfterPayment(args: {
  totalAmount: number
  balanceDue: number
  currentStatus: InvoiceStatus
}): InvoiceStatus {
  if (args.balanceDue <= 0) return "paid"
  if (args.balanceDue < args.totalAmount) return "partially_paid"
  return args.currentStatus === "draft" ? "sent" : args.currentStatus
}

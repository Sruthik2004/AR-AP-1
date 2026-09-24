import { roundMoney } from "@/types/invoices"

export function splitTaxFromTotal(
  items: { quantity: number; unit_price: number }[],
  total: number
) {
  const netFromLines = roundMoney(
    items.reduce(
      (sum, item) => sum + roundMoney(item.quantity * item.unit_price),
      0
    )
  )
  const documentTotal = roundMoney(total)
  const tax = roundMoney(Math.max(0, documentTotal - netFromLines))
  const net = roundMoney(documentTotal - tax)
  return { net, tax, total: documentTotal }
}

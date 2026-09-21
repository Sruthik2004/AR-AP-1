const inrFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 2,
})

/** Format a number as Indian Rupees (₹). */
export function formatINR(amount: number) {
  return inrFormatter.format(amount)
}

export const DEFAULT_CURRENCY = "INR" as const

export function formatMoney(amount: number, currency: string) {
  const code = currency.trim().toUpperCase() || "INR"
  const locale = code === "INR" ? "en-IN" : "en-US"
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: code,
      maximumFractionDigits: 2,
    }).format(amount)
  } catch {
    return `${code} ${amount.toFixed(2)}`
  }
}

/** Format a number as Indian Rupees (₹). */
export function formatINR(amount: number) {
  return formatMoney(amount, "INR")
}

export const DEFAULT_CURRENCY = "INR" as const

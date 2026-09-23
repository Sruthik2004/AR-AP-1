export type FxQuote = {
  from: string
  to: "INR"
  rate: number
  asOf: string
  requestedOn: string
  source: string
}

type FrankfurterResponse = {
  date?: string
  base?: string
  rates?: Record<string, number>
}

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url, {
    cache: "no-store",
    signal: AbortSignal.timeout(8000),
  })
  if (!response.ok) {
    throw new Error(`FX request failed (${response.status})`)
  }
  return (await response.json()) as T
}

function daysBetween(fromIso: string, toIso: string) {
  const from = Date.parse(`${fromIso}T00:00:00Z`)
  const to = Date.parse(`${toIso}T00:00:00Z`)
  if (Number.isNaN(from) || Number.isNaN(to)) return Number.POSITIVE_INFINITY
  return Math.round((to - from) / 86_400_000)
}

export async function getHistoricalRateToInr(
  from: string,
  onDate: string
): Promise<FxQuote | null> {
  const code = from.trim().toUpperCase()
  if (!/^[A-Z]{3}$/.test(code)) return null
  if (!/^\d{4}-\d{2}-\d{2}$/.test(onDate)) return null

  if (code === "INR") {
    return {
      from: "INR",
      to: "INR",
      rate: 1,
      asOf: onDate,
      requestedOn: onDate,
      source: "identity",
    }
  }

  try {
    const data = await fetchJson<FrankfurterResponse>(
      `https://api.frankfurter.dev/v1/${onDate}?base=${encodeURIComponent(code)}&symbols=INR`
    )
    const rate = data.rates?.INR
    const asOf = data.date
    if (!rate || !Number.isFinite(rate) || rate <= 0 || !asOf) {
      return null
    }
    if (asOf > onDate) return null
    if (daysBetween(asOf, onDate) > 4) return null

    return {
      from: code,
      to: "INR",
      rate,
      asOf,
      requestedOn: onDate,
      source: "frankfurter",
    }
  } catch (error) {
    console.error("historical FX lookup failed", error)
    return null
  }
}

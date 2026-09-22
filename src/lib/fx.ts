export type FxQuote = {
  from: string
  to: "INR"
  rate: number
  asOf: string
  source: string
}

type FrankfurterResponse = {
  date?: string
  base?: string
  rates?: Record<string, number>
}

type OpenErResponse = {
  result?: string
  time_last_update_utc?: string
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

async function frankfurterRate(from: string, asOf?: string | null) {
  const date =
    asOf && /^\d{4}-\d{2}-\d{2}$/.test(asOf) ? asOf : "latest"
  const path = date === "latest" ? "latest" : date
  const data = await fetchJson<FrankfurterResponse>(
    `https://api.frankfurter.dev/v1/${path}?base=${encodeURIComponent(from)}&symbols=INR`
  )
  const rate = data.rates?.INR
  if (!rate || !Number.isFinite(rate) || rate <= 0) {
    throw new Error("Frankfurter did not return a USD/INR rate.")
  }
  return {
    from,
    to: "INR",
    rate,
    asOf: data.date ?? (date === "latest" ? new Date().toISOString().slice(0, 10) : date),
    source: "frankfurter",
  } satisfies FxQuote
}

async function openErRate(from: string) {
  const data = await fetchJson<OpenErResponse>(
    `https://open.er-api.com/v6/latest/${encodeURIComponent(from)}`
  )
  const rate = data.rates?.INR
  if (data.result !== "success" || !rate || !Number.isFinite(rate) || rate <= 0) {
    throw new Error("Fallback FX feed did not return an INR rate.")
  }
  const asOf = data.time_last_update_utc
    ? new Date(data.time_last_update_utc).toISOString().slice(0, 10)
    : new Date().toISOString().slice(0, 10)
  return {
    from,
    to: "INR",
    rate,
    asOf,
    source: "open.er-api",
  } satisfies FxQuote
}

export async function getRateToInr(
  from: string,
  asOf?: string | null
): Promise<FxQuote | null> {
  const code = from.trim().toUpperCase()
  if (!/^[A-Z]{3}$/.test(code)) return null
  if (code === "INR") {
    return {
      from: "INR",
      to: "INR",
      rate: 1,
      asOf: asOf ?? new Date().toISOString().slice(0, 10),
      source: "identity",
    }
  }

  try {
    return await frankfurterRate(code, asOf)
  } catch (primary) {
    console.error("primary FX lookup failed", primary)
    try {
      return await openErRate(code)
    } catch (fallback) {
      console.error("fallback FX lookup failed", fallback)
      return null
    }
  }
}

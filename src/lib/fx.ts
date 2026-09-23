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

async function frankfurterLatest(from: string) {
  const data = await fetchJson<FrankfurterResponse>(
    `https://api.frankfurter.dev/v1/latest?base=${encodeURIComponent(from)}&symbols=INR`
  )
  const rate = data.rates?.INR
  if (!rate || !Number.isFinite(rate) || rate <= 0) {
    throw new Error("Frankfurter did not return a USD/INR rate.")
  }
  return {
    from,
    to: "INR",
    rate,
    asOf: data.date ?? new Date().toISOString().slice(0, 10),
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

export async function getRateToInr(from: string): Promise<FxQuote | null> {
  const code = from.trim().toUpperCase()
  if (!/^[A-Z]{3}$/.test(code)) return null
  if (code === "INR") {
    return {
      from: "INR",
      to: "INR",
      rate: 1,
      asOf: new Date().toISOString().slice(0, 10),
      source: "identity",
    }
  }

  try {
    return await openErRate(code)
  } catch (primary) {
    console.error("primary FX lookup failed", primary)
    try {
      return await frankfurterLatest(code)
    } catch (fallback) {
      console.error("fallback FX lookup failed", fallback)
      return null
    }
  }
}

import { getSessionClient } from "@/lib/auth/org"
import type { RfqDetail, RfqListItem, RfqQuote, RfqStatus } from "@/types/rfq"

type QuoteRow = {
  id: string
  rfq_id: string
  vendor_id: string
  amount: number
  created_at: string
}

type RfqRow = {
  id: string
  title: string
  status: RfqStatus
  created_at: string
  selected_quote_id: string | null
}

function lowestAmount(quotes: { amount: number }[]) {
  if (!quotes.length) return null
  return Math.min(...quotes.map((quote) => Number(quote.amount)))
}

export async function getRfqs(): Promise<{
  rfqs: RfqListItem[]
  error: string | null
}> {
  const session = await getSessionClient()
  if (!session.ok) return { rfqs: [], error: session.error }

  const { supabase } = session
  const { data, error } = await supabase
    .from("rfqs")
    .select("id, title, status, created_at, selected_quote_id")
    .order("created_at", { ascending: false })
  if (error) return { rfqs: [], error: error.message }

  const rows = (data ?? []) as RfqRow[]
  if (!rows.length) return { rfqs: [], error: null }

  const { data: quoteData, error: quoteError } = await supabase
    .from("rfq_quotes")
    .select("id, rfq_id, vendor_id, amount, created_at")
    .in(
      "rfq_id",
      rows.map((row) => row.id)
    )
  if (quoteError) return { rfqs: [], error: quoteError.message }
  const quotes = (quoteData ?? []) as QuoteRow[]

  const vendorIds = [...new Set(quotes.map((quote) => quote.vendor_id))]
  const names = new Map<string, string>()
  if (vendorIds.length) {
    const { data: vendors, error: vendorsError } = await supabase
      .from("contacts")
      .select("id, name")
      .in("id", vendorIds)
    if (vendorsError) return { rfqs: [], error: vendorsError.message }
    for (const vendor of vendors ?? []) names.set(vendor.id, vendor.name)
  }

  return {
    rfqs: rows.map((row) => {
      const mine = quotes.filter((quote) => quote.rfq_id === row.id)
      const selected = mine.find((quote) => quote.id === row.selected_quote_id)
      return {
        id: row.id,
        title: row.title,
        status: row.status,
        createdAt: row.created_at,
        quoteCount: mine.length,
        lowestAmount: lowestAmount(mine),
        selectedVendorName: selected
          ? (names.get(selected.vendor_id) ?? "Vendor")
          : null,
        selectedAmount: selected ? Number(selected.amount) : null,
      }
    }),
    error: null,
  }
}

export async function getRfq(id: string): Promise<{
  rfq: RfqDetail | null
  error: string | null
}> {
  const session = await getSessionClient()
  if (!session.ok) return { rfq: null, error: session.error }

  const { supabase } = session
  const { data, error } = await supabase
    .from("rfqs")
    .select("id, title, status, created_at, selected_quote_id")
    .eq("id", id)
    .maybeSingle()
  if (error) return { rfq: null, error: error.message }
  if (!data) return { rfq: null, error: "This request for quotation was not found." }

  const row = data as RfqRow
  const { data: quoteData, error: quoteError } = await supabase
    .from("rfq_quotes")
    .select("id, rfq_id, vendor_id, amount, created_at")
    .eq("rfq_id", row.id)
  if (quoteError) return { rfq: null, error: quoteError.message }
  const quotes = (quoteData ?? []) as QuoteRow[]

  const vendorIds = [...new Set(quotes.map((quote) => quote.vendor_id))]
  const names = new Map<string, string>()
  if (vendorIds.length) {
    const { data: vendors, error: vendorsError } = await supabase
      .from("contacts")
      .select("id, name")
      .in("id", vendorIds)
    if (vendorsError) return { rfq: null, error: vendorsError.message }
    for (const vendor of vendors ?? []) names.set(vendor.id, vendor.name)
  }

  const mapped: RfqQuote[] = quotes
    .map((quote) => ({
      id: quote.id,
      vendorId: quote.vendor_id,
      vendorName: names.get(quote.vendor_id) ?? "Vendor",
      amount: Number(quote.amount),
      createdAt: quote.created_at,
    }))
    .sort((a, b) => a.amount - b.amount || a.createdAt.localeCompare(b.createdAt))

  return {
    rfq: {
      id: row.id,
      title: row.title,
      status: row.status,
      selectedQuoteId: row.selected_quote_id,
      quotes: mapped,
    },
    error: null,
  }
}

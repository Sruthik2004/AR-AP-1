export type RfqStatus = "open" | "evaluated"

export type RfqQuote = {
  id: string
  vendorId: string
  vendorName: string
  amount: number
  createdAt: string
}

export type RfqListItem = {
  id: string
  title: string
  status: RfqStatus
  createdAt: string
  quoteCount: number
  lowestAmount: number | null
  selectedVendorName: string | null
  selectedAmount: number | null
}

export type RfqDetail = {
  id: string
  title: string
  status: RfqStatus
  selectedQuoteId: string | null
  quotes: RfqQuote[]
}

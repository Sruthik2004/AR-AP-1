import { GST_TAX_RATES } from "@/types/bills"

export type ParsedInvoiceItem = {
  description: string
  quantity: number
  unitPrice: number
  taxRate: number
}

export type ParsedInvoice = {
  vendorName: string
  vendorEmail: string
  vendorPhone: string
  vendorTaxId: string
  billNumber: string
  invoiceDate: string | null
  dueDate: string | null
  currency: string
  items: ParsedInvoiceItem[]
}

type KnownVendor = {
  name: string
}

const MONTHS: Record<string, number> = {
  jan: 1,
  january: 1,
  feb: 2,
  february: 2,
  mar: 3,
  march: 3,
  apr: 4,
  april: 4,
  may: 5,
  jun: 6,
  june: 6,
  jul: 7,
  july: 7,
  aug: 8,
  august: 8,
  sep: 9,
  sept: 9,
  september: 9,
  oct: 10,
  october: 10,
  nov: 11,
  november: 11,
  dec: 12,
  december: 12,
}

function nearestGst(rate: number) {
  return GST_TAX_RATES.reduce((best, candidate) =>
    Math.abs(candidate - rate) < Math.abs(best - rate) ? candidate : best
  )
}

export function normalizeName(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(
      /\b(pvt|pvt ltd|private|limited|ltd|llp|inc|llc|co|company)\b/g,
      " "
    )
    .replace(/\s+/g, " ")
    .trim()
}

function toIsoDate(year: number, month: number, day: number) {
  if (year < 100) year += year >= 70 ? 1900 : 2000
  if (month < 1 || month > 12 || day < 1 || day > 31) return null
  const date = new Date(Date.UTC(year, month - 1, day))
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null
  }
  return date.toISOString().slice(0, 10)
}

function parseLooseDate(raw: string) {
  const value = raw.trim()
  const iso = value.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (iso) {
    return toIsoDate(Number(iso[1]), Number(iso[2]), Number(iso[3]))
  }

  const numeric = value.match(/^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{2,4})$/)
  if (numeric) {
    const first = Number(numeric[1])
    const second = Number(numeric[2])
    const year = Number(numeric[3])
    if (first > 12) return toIsoDate(year, second, first)
    return toIsoDate(year, second, first)
  }

  const named = value.match(
    /^(\d{1,2})[\s.\-]([A-Za-z]{3,9})[\s.\-,]+(\d{2,4})$/
  )
  if (named) {
    const month = MONTHS[named[2].toLowerCase()]
    if (!month) return null
    return toIsoDate(Number(named[3]), month, Number(named[1]))
  }

  return null
}

function parseMoney(raw: string) {
  const cleaned = raw.replace(/[^0-9.]/g, "")
  if (!cleaned) return null
  const amount = Number(cleaned)
  return Number.isFinite(amount) ? amount : null
}

function labeledValue(text: string, labels: RegExp) {
  const match = text.match(labels)
  return match?.[1]?.trim() ?? ""
}

function firstEmail(text: string) {
  return text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0] ?? ""
}

function firstPhone(text: string) {
  const match = text.match(/(?:\+?91[\s-]?)?[6-9]\d{9}/)
  return match?.[0]?.replace(/\s+/g, "") ?? ""
}

function firstGstin(text: string) {
  return (
    text.match(
      /\b[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][A-Z0-9]Z[A-Z0-9]\b/i
    )?.[0] ?? ""
  ).toUpperCase()
}

function sellerSection(text: string) {
  return text.split(
    /bill\s*to|billed\s*to|buyer|customer\s*name|ship\s*to|place\s*of\s*supply/i
  )[0]
}

function companyLike(line: string) {
  return /\b(pvt\.?\s*ltd\.?|private\s+limited|limited|ltd\.?|llp|inc\.?|llc|enterprises|traders|supplies|solutions|industries)\b/i.test(
    line
  )
}

function findVendorName(text: string, knownVendors: KnownVendor[]) {
  const normalizedText = normalizeName(text)
  const known = knownVendors.find((vendor) => {
    const current = normalizeName(vendor.name)
    return current.length >= 3 && normalizedText.includes(current)
  })
  if (known) return known.name

  const seller = sellerSection(text)
  const labeled = labeledValue(
    seller,
    /(?:supplier|seller|vendor|from|billed\s*by|tax\s*invoice\s*from)[:\s]+([^\n]{3,80})/i
  )
  if (labeled && !/tax\s*invoice|original|duplicate/i.test(labeled)) {
    return labeled.replace(/\s+/g, " ").trim()
  }

  const lines = seller
    .split(/\n+/)
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean)

  const company = lines.find(
    (line) =>
      companyLike(line) &&
      !/tax\s*invoice|original\s+for|duplicate|gstin|invoice\s*no/i.test(line)
  )
  if (company) return company

  return (
    lines.find(
      (line) =>
        line.length >= 4 &&
        line.length <= 80 &&
        !/tax\s*invoice|original|duplicate|gstin|invoice|date|phone|email|address/i.test(
          line
        )
    ) ?? ""
  )
}

function detectCurrency(text: string) {
  const totalLine =
    text.match(
      /(?:grand\s*total|invoice\s*total|amount\s*payable|(?<![a-z])total(?!\s*in\s*words))[^\n]{0,48}/i
    )?.[0] ?? ""

  const scored = [
    { code: "USD", pattern: /\$|usd|united states dollar/i },
    { code: "EUR", pattern: /€|eur\b|euro/i },
    { code: "GBP", pattern: /£|gbp\b|pound sterling/i },
    { code: "AED", pattern: /\baed\b|dirham/i },
    { code: "INR", pattern: /₹|\binr\b|\brs\.?\b|rupee/i },
  ] as const

  for (const candidate of scored) {
    if (candidate.pattern.test(totalLine)) return candidate.code
  }
  for (const candidate of scored) {
    if (candidate.pattern.test(text)) return candidate.code
  }
  return "INR"
}

function findBillNumber(text: string, fileName?: string) {
  const labeled = labeledValue(
    text,
    /(?:invoice|bill|tax\s*invoice|inv|document)[\s#:.-]*(?:no|number|#)?[:.\s]*([A-Z0-9][A-Z0-9/._-]{2,})/i
  )
  if (labeled && !/date|gstin/i.test(labeled)) return labeled

  const stem = fileName?.replace(/\.[^.]+$/, "") ?? ""
  if (/^[A-Z0-9][A-Z0-9._-]{2,}$/i.test(stem)) return stem
  return ""
}

function findLabeledDate(text: string, labels: RegExp) {
  const match = text.match(labels)
  return match?.[1] ? parseLooseDate(match[1]) : null
}

function findAnyDate(text: string) {
  const matches = text.matchAll(
    /(\d{1,2}[\/.\-]\d{1,2}[\/.\-]\d{2,4}|\d{4}-\d{2}-\d{2}|\d{1,2}[\s.\-][A-Za-z]{3,9}[\s.\-,]+\d{2,4})/g
  )
  for (const match of matches) {
    const parsed = parseLooseDate(match[1])
    if (parsed) return parsed
  }
  return null
}

function documentGst(text: string) {
  const percent =
    text.match(/igst\s*0?\s*\(?\s*(\d{1,2})\s*%/i) ??
    text.match(/\b(?:cgst|sgst|utgst)\s*0?\s*\(?\s*(\d{1,2})\s*%/i) ??
    text.match(/(?<![a-z])gst(?!in)\s*0?\s*\(?\s*(\d{1,2})\s*%/i)

  if (percent) return nearestGst(Number(percent[1]))

  const cgst = Number(text.match(/\bcgst\b[^%\n]{0,12}(\d{1,2})\s*%/i)?.[1] ?? 0)
  const sgst = Number(text.match(/\bsgst\b[^%\n]{0,12}(\d{1,2})\s*%/i)?.[1] ?? 0)
  if (cgst || sgst) return nearestGst(cgst + sgst)

  if (/without payment of tax|\blut\b|export under/i.test(text)) return 0

  return 18
}

function isYear(value: number) {
  return Number.isInteger(value) && value >= 1900 && value <= 2100
}

function isHsn(value: string) {
  return /^\d{4,8}$/.test(value)
}

function isSummaryLine(line: string) {
  return /^(sub\s*total|taxable|igst|cgst|sgst|utgst|gst|round\s*off|grand\s*total|amount\s*payable|total\s*in\s*words|amount\s*in\s*words|total\b)/i.test(
    line
  )
}

function isJunkDescription(line: string) {
  return /^(sno|sl\.?\s*no|item|description|hsn|sac|qty|quantity|rate|amount|particulars|page\s+\d)\b/i.test(
    line
  )
}

function trailingMoney(line: string) {
  const match = line.match(/((?:[$₹]|rs\.?|inr)?\s*[\d,]+\.\d{2})\s*$/i)
  if (!match || match.index == null) return null
  const amount = parseMoney(match[1])
  if (amount == null) return null
  return {
    amount,
    rest: line.slice(0, match.index).trim(),
  }
}

function parseAmountRow(line: string, taxRate: number): ParsedInvoiceItem | null {
  const money = trailingMoney(line)
  if (!money || money.amount <= 0) return null

  let rest = money.rest
  rest = rest.replace(/\s+\d{1,2}\s*%$/i, "").trim()

  const hsn = rest.match(/\s(\d{4,8})$/)
  if (hsn) rest = rest.slice(0, -hsn[0].length).trim()

  const qtyRate = rest.match(/\s+(\d+(?:\.\d+)?)\s+([\d,]+\.?\d{0,2})$/)
  let quantity = 1
  let unitPrice = money.amount
  if (qtyRate) {
    const qty = Number(qtyRate[1])
    const rate = parseMoney(qtyRate[2])
    if (
      rate != null &&
      !isYear(qty) &&
      !isHsn(qtyRate[1]) &&
      !isHsn(qtyRate[2].replace(/,/g, ""))
    ) {
      quantity = Math.max(1, Math.round(qty) || 1)
      unitPrice = rate
      rest = rest.slice(0, -qtyRate[0].length).trim()
    }
  }

  rest = rest.replace(/^\d{1,3}\s+/, "").trim()
  if (rest.length < 3 || isJunkDescription(rest) || isSummaryLine(rest)) {
    return null
  }

  return {
    description: rest.replace(/\s+/g, " "),
    quantity,
    unitPrice,
    taxRate,
  }
}

function parseLineItems(text: string, taxRate: number): ParsedInvoiceItem[] {
  const lines = text
    .split(/\n+/)
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean)

  const headerIndex = lines.findIndex((line) =>
    /(?:s\.?\s*no|sno|sl\.?\s*no).*(?:item|description|particulars)/i.test(line)
  )
  const body = headerIndex >= 0 ? lines.slice(headerIndex + 1) : lines
  const items: ParsedInvoiceItem[] = []

  for (const line of body) {
    if (isSummaryLine(line) || /total\s*in\s*words|authorized\s+signature|payment\s+terms/i.test(line)) {
      if (items.length) break
      continue
    }
    const item = parseAmountRow(line, taxRate)
    if (item) items.push(item)
  }

  if (items.length) return items

  const grandTotal = parseMoney(
    labeledValue(
      text,
      /(?:grand\s*total|invoice\s*total|amount\s*payable|net\s*payable|(?<![a-z])total(?!\s*in\s*words))[^\d$₹]{0,12}((?:[$₹]|rs\.?|inr)?\s*[\d,]+(?:\.\d{1,2})?)/i
    )
  )

  if (grandTotal && grandTotal > 0) {
    return [
      {
        description: "Invoice total",
        quantity: 1,
        unitPrice: grandTotal,
        taxRate,
      },
    ]
  }

  return []
}

export function parseInvoiceText(
  text: string,
  options?: { fileName?: string; knownVendors?: KnownVendor[] }
): ParsedInvoice {
  const cleaned = text.replace(/\u00a0/g, " ").replace(/[ \t]+/g, " ")
  const taxRate = documentGst(cleaned)
  const invoiceDate =
    findLabeledDate(
      cleaned,
      /(?:invoice\s*date|bill\s*date|dated)[:\s]+([0-9A-Za-z/.\- ,]{6,20})/i
    ) ?? findAnyDate(cleaned)

  let dueDate = findLabeledDate(
    cleaned,
    /(?:due\s*date|payment\s*due|pay\s*by)[:\s]+([0-9A-Za-z/.\- ,]{6,20})/i
  )
  if (
    !dueDate &&
    invoiceDate &&
    /due on receipt|upon receipt of invoice|payment to be made upon receipt/i.test(
      cleaned
    )
  ) {
    dueDate = invoiceDate
  }

  return {
    vendorName: findVendorName(cleaned, options?.knownVendors ?? []),
    vendorEmail: firstEmail(cleaned),
    vendorPhone: firstPhone(cleaned),
    vendorTaxId: firstGstin(cleaned),
    billNumber: findBillNumber(cleaned, options?.fileName),
    invoiceDate,
    dueDate,
    currency: detectCurrency(cleaned),
    items: parseLineItems(cleaned, taxRate),
  }
}

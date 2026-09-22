"use server"

import { revalidatePath } from "next/cache"

import { parseInvoiceText, normalizeName } from "@/lib/ap/parse-invoice-text"
import { readBillText } from "@/lib/ap/read-bill-text"
import { requireOrgContext } from "@/lib/auth/org"
import { DEFAULT_CURRENCY, formatINR, formatMoney } from "@/lib/currency"
import { getRateToInr } from "@/lib/fx"
import { calcLineTotal, roundMoney } from "@/types/bills"

const EXTRACT_MIME = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
])

export type ExtractedBillItem = {
  description: string
  quantity: string
  unit_price: string
  tax_rate: string
}

export type ExtractedVendor = {
  id: string
  name: string
  email: string
  currency: string
}

export type ExtractBillResult =
  | {
      success: true
      vendorId: string | null
      newVendor: ExtractedVendor | null
      billNumber: string | null
      dueDate: string | null
      items: ExtractedBillItem[]
      message: string
    }
  | { success: false; error: string }

function addDaysIso(iso: string, days: number) {
  const date = new Date(`${iso}T00:00:00Z`)
  if (Number.isNaN(date.getTime())) return null
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}

function resolveMediaType(file: File) {
  if (EXTRACT_MIME.has(file.type)) return file.type
  const name = file.name.toLowerCase()
  if (name.endsWith(".pdf")) return "application/pdf"
  if (name.endsWith(".png")) return "image/png"
  if (name.endsWith(".jpg") || name.endsWith(".jpeg")) return "image/jpeg"
  if (name.endsWith(".webp")) return "image/webp"
  return file.type || "application/octet-stream"
}

function vendorPlaceholderEmail(name: string) {
  const slug =
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "vendor"
  return `${slug}@vendors.sbcllp.in`
}

export async function extractBillFromUpload(
  formData: FormData
): Promise<ExtractBillResult> {
  const auth = await requireOrgContext()
  if (!auth.ok) return { success: false, error: auth.error }

  const { supabase, orgId, userId } = auth.ctx
  const file = formData.get("attachment")

  if (!(file instanceof File) || file.size === 0) {
    return { success: false, error: "Choose a PDF or image of the vendor bill." }
  }

  if (file.size > 10 * 1024 * 1024) {
    return { success: false, error: "Attachment must be 10MB or smaller." }
  }

  const mediaType = resolveMediaType(file)
  if (!EXTRACT_MIME.has(mediaType)) {
    return {
      success: false,
      error:
        "OCR works with PDF, JPG, PNG, or WebP. Word files can still be attached, but details must be entered by hand.",
    }
  }

  const { data: vendors, error: vendorsError } = await supabase
    .from("contacts")
    .select("id, name, email, currency")
    .eq("type", "vendor")
    .eq("org_id", orgId)

  if (vendorsError) {
    return { success: false, error: vendorsError.message }
  }

  const knownVendors = vendors ?? []
  const bytes = new Uint8Array(await file.arrayBuffer())

  let text = ""
  try {
    text = await readBillText(bytes, mediaType)
  } catch (error) {
    console.error("bill OCR failed", error)
    return {
      success: false,
      error:
        "OCR could not read this bill. Use a clear PDF or photo, then fill any missing fields.",
    }
  }

  if (text.replace(/\s+/g, " ").trim().length < 12) {
    return {
      success: false,
      error:
        "OCR found no readable text. Try a clearer PDF or photo, then fill any missing fields.",
    }
  }

  const extracted = parseInvoiceText(text, {
    fileName: file.name,
    knownVendors,
  })

  const vendorName = extracted.vendorName.trim()
  const vendorEmail = extracted.vendorEmail.trim()
  const billNumber = extracted.billNumber.trim() || null
  let dueDate = extracted.dueDate
  if (!dueDate && extracted.invoiceDate) {
    dueDate = addDaysIso(extracted.invoiceDate, 30)
  }

  const sourceCurrency = extracted.currency || DEFAULT_CURRENCY
  let fxNote: string | null = null
  let amountMultiplier = 1

  if (sourceCurrency !== DEFAULT_CURRENCY) {
    const quote = await getRateToInr(
      sourceCurrency,
      extracted.invoiceDate ?? dueDate
    )
    if (!quote) {
      return {
        success: false,
        error: `This bill is in ${sourceCurrency}. An INR exchange rate could not be fetched, so amounts were not posted as rupees. Try the upload again.`,
      }
    }
    amountMultiplier = quote.rate
    const sourceTotal = extracted.items.reduce(
      (sum, item) => sum + calcLineTotal(item.quantity, item.unitPrice, item.taxRate),
      0
    )
    fxNote = `Bill is ${sourceCurrency}. Converted ${formatMoney(sourceTotal, sourceCurrency)} at ${formatINR(quote.rate)} per ${sourceCurrency} (${quote.asOf}) → ${formatINR(roundMoney(sourceTotal * quote.rate))}.`
  }

  const items = extracted.items
    .map((item) => {
      const description = item.description.trim()
      if (!description || !Number.isFinite(item.unitPrice) || item.unitPrice < 0) {
        return null
      }
      return {
        description,
        quantity: String(Math.max(1, Math.round(item.quantity) || 1)),
        unit_price: String(roundMoney(item.unitPrice * amountMultiplier)),
        tax_rate: String(item.taxRate),
      } satisfies ExtractedBillItem
    })
    .filter((item): item is ExtractedBillItem => item !== null)

  let vendorId: string | null = null
  let newVendor: ExtractedVendor | null = null

  if (vendorName) {
    const wanted = normalizeName(vendorName)
    const match = knownVendors.find((vendor) => {
      const current = normalizeName(vendor.name)
      return (
        current === wanted ||
        current.includes(wanted) ||
        wanted.includes(current)
      )
    })

    if (match) {
      vendorId = match.id
    } else {
      const email = vendorEmail.includes("@")
        ? vendorEmail
        : vendorPlaceholderEmail(vendorName)
      const { data: created, error: createError } = await supabase
        .from("contacts")
        .insert({
          org_id: orgId,
          type: "vendor",
          name: vendorName,
          email,
          phone: extracted.vendorPhone.trim() || null,
          tax_id: extracted.vendorTaxId.trim() || null,
          currency: sourceCurrency,
        })
        .select("id, name, email, currency")
        .single()

      if (!createError && created) {
        vendorId = created.id
        newVendor = {
          id: created.id,
          name: created.name,
          email: created.email,
          currency: created.currency,
        }
        await supabase.from("audit_logs").insert({
          org_id: orgId,
          user_id: userId,
          action: "contact.create",
          entity: "contacts",
          entity_id: created.id,
          changes_json: {
            after: {
              source: "bill-ocr",
              name: vendorName,
              email,
            },
          },
        })
        revalidatePath("/dashboard/contacts")
        revalidatePath("/dashboard/ap")
        revalidatePath("/dashboard/ap/new")
      }
    }
  }

  const filled = [
    vendorId ? "vendor" : null,
    billNumber ? "bill number" : null,
    dueDate ? "due date" : null,
    items.length ? "line items" : null,
  ].filter(Boolean)

  return {
    success: true,
    vendorId,
    newVendor,
    billNumber,
    dueDate,
    items,
    message: filled.length
      ? `${fxNote ? `${fxNote} ` : ""}Filled ${filled.join(", ")} from OCR. Review before submitting.`
      : "The file is attached, but OCR could not find bill details. Enter them manually.",
  }
}

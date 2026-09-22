"use server"

import { revalidatePath } from "next/cache"
import { generateText, Output } from "ai"
import { z } from "zod"

import { requireOrgContext } from "@/lib/auth/org"
import { DEFAULT_CURRENCY } from "@/lib/currency"
import { GST_TAX_RATES } from "@/types/bills"

const EXTRACT_MIME = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
])

const billExtractSchema = z.object({
  vendorName: z.string(),
  vendorEmail: z.string(),
  vendorPhone: z.string(),
  vendorTaxId: z.string(),
  billNumber: z.string(),
  invoiceDate: z.string(),
  dueDate: z.string(),
  items: z.array(
    z.object({
      description: z.string(),
      quantity: z.number(),
      unitPrice: z.number(),
      taxRate: z.number(),
    })
  ),
})

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

function normalizeName(value: string) {
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

function nearestGst(rate: number) {
  return GST_TAX_RATES.reduce((best, candidate) =>
    Math.abs(candidate - rate) < Math.abs(best - rate) ? candidate : best
  )
}

function parseIsoDate(value: string) {
  const match = value.trim().match(/^(\d{4}-\d{2}-\d{2})/)
  return match?.[1] ?? null
}

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
        "Auto-fill works with PDF, JPG, PNG, or WebP. Word files can still be attached, but details must be entered by hand.",
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

  let extracted: z.infer<typeof billExtractSchema>
  try {
    const result = await generateText({
      model: "openai/gpt-5.4",
      output: Output.object({ schema: billExtractSchema }),
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Extract a vendor bill / tax invoice for an Indian AP system.
Return empty strings when a field is not visible.
Dates must be YYYY-MM-DD. Use dueDate when printed; otherwise leave dueDate empty and still return invoiceDate.
Quantity should be a whole number when possible.
taxRate is GST percent (0, 5, 12, 18, or 28).
Prefer the seller/vendor (who issued the invoice), not the customer/bill-to party.
Known vendors: ${
                knownVendors.length
                  ? knownVendors
                      .map((vendor) => `${vendor.name} <${vendor.email ?? ""}>`)
                      .join("; ")
                  : "none"
              }.`,
            },
            {
              type: "file",
              data: bytes,
              mediaType,
              filename: file.name,
            },
          ],
        },
      ],
    })

    if (!result.output) {
      return {
        success: false,
        error: "Could not read details from this file. Enter them manually.",
      }
    }

    extracted = result.output
  } catch (error) {
    const message = error instanceof Error ? error.message : ""
    if (/api key|oidc|unauthorized|forbidden/i.test(message)) {
      return {
        success: false,
        error:
          "Bill reading is not configured yet. The file is still attached — fill vendor, dates, and items by hand.",
      }
    }
    return {
      success: false,
      error:
        "Could not read this bill automatically. Check the file is a clear PDF or photo, then fill any missing fields.",
    }
  }

  const vendorName = extracted.vendorName.trim()
  const vendorEmail = extracted.vendorEmail.trim()
  const billNumber = extracted.billNumber.trim() || null
  let dueDate = parseIsoDate(extracted.dueDate)
  if (!dueDate) {
    const invoiceDate = parseIsoDate(extracted.invoiceDate)
    if (invoiceDate) dueDate = addDaysIso(invoiceDate, 30)
  }

  const items = (extracted.items ?? [])
    .map((item) => {
      const description = item.description.trim()
      const quantity = Math.max(1, Math.round(Number(item.quantity) || 1))
      const unitPrice = Number(item.unitPrice)
      const taxRate = nearestGst(Number(item.taxRate) || 0)
      if (!description || !Number.isFinite(unitPrice) || unitPrice < 0) {
        return null
      }
      return {
        description,
        quantity: String(quantity),
        unit_price: String(unitPrice),
        tax_rate: String(taxRate),
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
      const email =
        vendorEmail.includes("@") ? vendorEmail : vendorPlaceholderEmail(vendorName)
      const { data: created, error: createError } = await supabase
        .from("contacts")
        .insert({
          org_id: orgId,
          type: "vendor",
          name: vendorName,
          email,
          phone: extracted.vendorPhone.trim() || null,
          tax_id: extracted.vendorTaxId.trim() || null,
          currency: DEFAULT_CURRENCY,
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
              source: "bill-upload",
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
      ? `Filled ${filled.join(", ")} from the upload. Review before submitting.`
      : "The file is attached, but no bill details could be read. Enter them manually.",
  }
}

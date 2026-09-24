import { revalidatePath } from "next/cache"

import { splitTaxFromTotal } from "@/lib/accounting/amounts"
import { ACCOUNT_CODES, type JournalSource } from "@/lib/accounting/codes"
import type { OrgContext } from "@/lib/auth/org"
import { roundMoney } from "@/types/invoices"

type Supabase = OrgContext["supabase"]

export type PostResult = { ok: true; id: string } | { ok: false; error: string }

type JournalLineInput = {
  account_id: string
  description: string
  debit: number
  credit: number
}

const ACCOUNTING_PATHS = [
  "/dashboard/accounting",
  "/dashboard/accounting/journals",
  "/dashboard/accounting/trial-balance",
  "/dashboard/accounting/profit-and-loss",
  "/dashboard/accounting/balance-sheet",
  "/dashboard/accounting/cash",
]

export function revalidateAccounting() {
  for (const path of ACCOUNTING_PATHS) revalidatePath(path)
}

function postingDateInIndia(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date)
}

async function accountIds(
  supabase: Supabase,
  orgId: string,
  codes: string[]
): Promise<{ ok: true; ids: Map<string, string> } | { ok: false; error: string }> {
  const { data, error } = await supabase
    .from("accounts")
    .select("id, code")
    .eq("org_id", orgId)
    .eq("is_group", false)
    .in("code", codes)

  if (error) return { ok: false, error: error.message }

  const ids = new Map((data ?? []).map((row) => [row.code as string, row.id as string]))
  const missing = codes.filter((code) => !ids.has(code))
  if (missing.length > 0) {
    return {
      ok: false,
      error: `Chart of accounts is missing ${missing.join(", ")}. Open Accounting after the database migration has been applied.`,
    }
  }

  return { ok: true, ids }
}

export async function postJournal(
  supabase: Supabase,
  input: {
    postingDate: string
    description: string
    source: JournalSource
    sourceId?: string | null
    lines: JournalLineInput[]
  }
): Promise<PostResult> {
  const lines = input.lines
    .map((line) => ({
      account_id: line.account_id,
      description: line.description,
      debit: roundMoney(line.debit),
      credit: roundMoney(line.credit),
    }))
    .filter((line) => line.debit > 0 || line.credit > 0)

  const { data, error } = await supabase.rpc("post_journal", {
    p_posting_date: input.postingDate,
    p_description: input.description,
    p_source: input.source,
    p_source_id: input.sourceId ?? null,
    p_lines: lines,
  })

  if (error || !data) {
    return { ok: false, error: error?.message ?? "Could not post the journal." }
  }

  revalidateAccounting()
  return { ok: true, id: data as string }
}

export async function postVendorBillJournal(
  supabase: Supabase,
  orgId: string,
  input: {
    billId: string
    billNumber: string
    items: { quantity: number; unit_price: number }[]
    total: number
  }
): Promise<PostResult> {
  const accounts = await accountIds(supabase, orgId, [
    ACCOUNT_CODES.operatingExpense,
    ACCOUNT_CODES.inputGst,
    ACCOUNT_CODES.accountsPayable,
  ])
  if (!accounts.ok) return accounts

  const { net, tax, total } = splitTaxFromTotal(input.items, input.total)
  const description = `Vendor bill ${input.billNumber}`
  const lines: JournalLineInput[] = [
    {
      account_id: accounts.ids.get(ACCOUNT_CODES.operatingExpense)!,
      description,
      debit: net,
      credit: 0,
    },
  ]

  if (tax > 0) {
    lines.push({
      account_id: accounts.ids.get(ACCOUNT_CODES.inputGst)!,
      description,
      debit: tax,
      credit: 0,
    })
  }

  lines.push({
    account_id: accounts.ids.get(ACCOUNT_CODES.accountsPayable)!,
    description,
    debit: 0,
    credit: total,
  })

  return postJournal(supabase, {
    postingDate: postingDateInIndia(),
    description,
    source: "ap_bill",
    sourceId: input.billId,
    lines,
  })
}

export async function postCustomerInvoiceJournal(
  supabase: Supabase,
  orgId: string,
  input: {
    invoiceId: string
    invoiceNumber: string
    issueDate: string
    items: { quantity: number; unit_price: number }[]
    total: number
  }
): Promise<PostResult> {
  const accounts = await accountIds(supabase, orgId, [
    ACCOUNT_CODES.accountsReceivable,
    ACCOUNT_CODES.sales,
    ACCOUNT_CODES.gstPayable,
  ])
  if (!accounts.ok) return accounts

  const { net, tax, total } = splitTaxFromTotal(input.items, input.total)
  const description = `Customer invoice ${input.invoiceNumber}`
  const lines: JournalLineInput[] = [
    {
      account_id: accounts.ids.get(ACCOUNT_CODES.accountsReceivable)!,
      description,
      debit: total,
      credit: 0,
    },
    {
      account_id: accounts.ids.get(ACCOUNT_CODES.sales)!,
      description,
      debit: 0,
      credit: net,
    },
  ]

  if (tax > 0) {
    lines.push({
      account_id: accounts.ids.get(ACCOUNT_CODES.gstPayable)!,
      description,
      debit: 0,
      credit: tax,
    })
  }

  return postJournal(supabase, {
    postingDate: input.issueDate,
    description,
    source: "ar_invoice",
    sourceId: input.invoiceId,
    lines,
  })
}

export async function postCustomerReceiptJournal(
  supabase: Supabase,
  orgId: string,
  input: {
    paymentId: string
    invoiceNumber: string
    amount: number
    paidOn: string
  }
): Promise<PostResult> {
  const accounts = await accountIds(supabase, orgId, [
    ACCOUNT_CODES.bank,
    ACCOUNT_CODES.accountsReceivable,
  ])
  if (!accounts.ok) return accounts

  const description = `Receipt for invoice ${input.invoiceNumber}`
  return postJournal(supabase, {
    postingDate: input.paidOn,
    description,
    source: "ar_payment",
    sourceId: input.paymentId,
    lines: [
      {
        account_id: accounts.ids.get(ACCOUNT_CODES.bank)!,
        description,
        debit: input.amount,
        credit: 0,
      },
      {
        account_id: accounts.ids.get(ACCOUNT_CODES.accountsReceivable)!,
        description,
        debit: 0,
        credit: input.amount,
      },
    ],
  })
}

import type { AccountType, JournalSource } from "@/lib/accounting/codes"
import type { LedgerRow } from "@/lib/accounting/statements"
import { getSessionClient } from "@/lib/auth/org"
import { roundMoney } from "@/types/invoices"

export type AccountRow = {
  id: string
  code: string
  name: string
  accountType: AccountType
  isGroup: boolean
}

export type BankAccountRow = {
  id: string
  name: string
  bankName: string | null
  accountNumber: string | null
  ifsc: string | null
  currency: string
  glCode: string
  glName: string
}

export type TaxCodeRow = {
  id: string
  name: string
  rate: number
}

export type JournalListRow = {
  id: string
  journalNumber: string
  postingDate: string
  description: string
  source: JournalSource
  debit: number
  credit: number
}

type QueryResult<T> = { rows: T; error: string | null }

function toNumber(value: unknown) {
  const amount = typeof value === "number" ? value : Number(value)
  return Number.isFinite(amount) ? amount : 0
}

export async function getAccounts(): Promise<QueryResult<AccountRow[]>> {
  const session = await getSessionClient()
  if (!session.ok) return { rows: [], error: session.error }

  const { data, error } = await session.supabase
    .from("accounts")
    .select("id, code, name, account_type, is_group")
    .order("code")

  if (error) return { rows: [], error: error.message }

  return {
    rows: (data ?? []).map((row) => ({
      id: row.id as string,
      code: row.code as string,
      name: row.name as string,
      accountType: row.account_type as AccountType,
      isGroup: Boolean(row.is_group),
    })),
    error: null,
  }
}

export async function getBankAccounts(): Promise<QueryResult<BankAccountRow[]>> {
  const session = await getSessionClient()
  if (!session.ok) return { rows: [], error: session.error }

  const { data, error } = await session.supabase
    .from("bank_accounts")
    .select("id, name, bank_name, account_number, ifsc, currency, accounts(code, name)")
    .order("name")

  if (error) return { rows: [], error: error.message }

  return {
    rows: (data ?? []).map((row) => {
      const account = Array.isArray(row.accounts) ? row.accounts[0] : row.accounts
      return {
        id: row.id as string,
        name: row.name as string,
        bankName: (row.bank_name as string | null) ?? null,
        accountNumber: (row.account_number as string | null) ?? null,
        ifsc: (row.ifsc as string | null) ?? null,
        currency: row.currency as string,
        glCode: (account?.code as string | undefined) ?? "",
        glName: (account?.name as string | undefined) ?? "",
      }
    }),
    error: null,
  }
}

export async function getTaxCodes(): Promise<QueryResult<TaxCodeRow[]>> {
  const session = await getSessionClient()
  if (!session.ok) return { rows: [], error: session.error }

  const { data, error } = await session.supabase
    .from("tax_codes")
    .select("id, name, rate")
    .order("rate")

  if (error) return { rows: [], error: error.message }

  return {
    rows: (data ?? []).map((row) => ({
      id: row.id as string,
      name: row.name as string,
      rate: toNumber(row.rate),
    })),
    error: null,
  }
}

export async function getJournals(): Promise<QueryResult<JournalListRow[]>> {
  const session = await getSessionClient()
  if (!session.ok) return { rows: [], error: session.error }

  const { data, error } = await session.supabase
    .from("journals")
    .select("id, journal_number, posting_date, description, source, journal_lines(debit, credit)")
    .eq("status", "posted")
    .order("posting_date", { ascending: false })
    .order("journal_number", { ascending: false })

  if (error) return { rows: [], error: error.message }

  return {
    rows: (data ?? []).map((row) => {
      const lines = Array.isArray(row.journal_lines) ? row.journal_lines : []
      return {
        id: row.id as string,
        journalNumber: row.journal_number as string,
        postingDate: row.posting_date as string,
        description: row.description as string,
        source: row.source as JournalSource,
        debit: roundMoney(
          lines.reduce((sum, line) => sum + toNumber(line.debit), 0)
        ),
        credit: roundMoney(
          lines.reduce((sum, line) => sum + toNumber(line.credit), 0)
        ),
      }
    }),
    error: null,
  }
}

export async function getLedger(): Promise<QueryResult<LedgerRow[]>> {
  const session = await getSessionClient()
  if (!session.ok) return { rows: [], error: session.error }

  const { data, error } = await session.supabase
    .from("journal_lines")
    .select("debit, credit, accounts(code, name, account_type, is_group), journals!inner(status)")
    .eq("journals.status", "posted")

  if (error) return { rows: [], error: error.message }

  const byCode = new Map<string, LedgerRow>()

  for (const line of data ?? []) {
    const account = Array.isArray(line.accounts) ? line.accounts[0] : line.accounts
    if (!account || account.is_group) continue
    const code = account.code as string
    const current = byCode.get(code) ?? {
      code,
      name: account.name as string,
      accountType: account.account_type as AccountType,
      debit: 0,
      credit: 0,
    }
    current.debit = roundMoney(current.debit + toNumber(line.debit))
    current.credit = roundMoney(current.credit + toNumber(line.credit))
    byCode.set(code, current)
  }

  return {
    rows: [...byCode.values()].sort((a, b) => a.code.localeCompare(b.code)),
    error: null,
  }
}

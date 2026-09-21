import { getSessionClient } from "@/lib/auth/org"
import type { InvoiceListItem } from "@/types/invoices"
import type { Contact } from "@/types/contacts"

export type InvoicesQueryResult = {
  invoices: InvoiceListItem[]
  error: string | null
}

export type CustomersQueryResult = {
  customers: Pick<Contact, "id" | "name" | "email" | "currency">[]
  error: string | null
}

function toNumber(value: unknown) {
  const n = typeof value === "number" ? value : Number(value)
  return Number.isFinite(n) ? n : 0
}

export async function getInvoices(): Promise<InvoicesQueryResult> {
  const session = await getSessionClient()
  if (!session.ok) {
    return { invoices: [], error: session.error }
  }

  try {
    const { supabase } = session
    const { data, error } = await supabase
      .from("invoices")
      .select(
        `
        id,
        org_id,
        customer_id,
        invoice_number,
        total_amount,
        balance_due,
        status,
        due_date,
        issue_date,
        created_at,
        customer:contacts!invoices_customer_id_fkey (
          id,
          name,
          email
        )
      `
      )
      .order("issue_date", { ascending: false })

    if (error) {
      return { invoices: [], error: error.message }
    }

    const invoices = (data ?? []).map((row) => {
      const customerRaw = row.customer
      const customer = Array.isArray(customerRaw)
        ? (customerRaw[0] ?? null)
        : (customerRaw ?? null)

      return {
        id: row.id as string,
        org_id: row.org_id as string,
        customer_id: row.customer_id as string,
        invoice_number: row.invoice_number as string,
        total_amount: toNumber(row.total_amount),
        balance_due: toNumber(row.balance_due),
        status: row.status as InvoiceListItem["status"],
        due_date: row.due_date as string,
        issue_date: row.issue_date as string,
        created_at: row.created_at as string,
        customer: customer
          ? {
              id: customer.id as string,
              name: customer.name as string,
              email: (customer.email as string | null) ?? null,
            }
          : null,
      } satisfies InvoiceListItem
    })

    return { invoices, error: null }
  } catch (error) {
    return {
      invoices: [],
      error:
        error instanceof Error
          ? error.message
          : "Unable to load invoices from Supabase.",
    }
  }
}

export async function getCustomerOptions(): Promise<CustomersQueryResult> {
  const session = await getSessionClient()
  if (!session.ok) {
    return { customers: [], error: session.error }
  }

  try {
    const { supabase } = session
    const { data, error } = await supabase
      .from("contacts")
      .select("id, name, email, currency")
      .eq("type", "customer")
      .order("name", { ascending: true })

    if (error) {
      return { customers: [], error: error.message }
    }

    return {
      customers: (data ?? []) as CustomersQueryResult["customers"],
      error: null,
    }
  } catch (error) {
    return {
      customers: [],
      error:
        error instanceof Error
          ? error.message
          : "Unable to load customers from Supabase.",
    }
  }
}

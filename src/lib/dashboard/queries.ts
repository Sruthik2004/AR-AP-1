import { getSessionClient } from "@/lib/auth/org"
import {
  buildAgingSummary,
  daysPastDue,
  isHighPriorityOverdue,
  type AgedDocument,
  type AgingBucket,
} from "@/lib/dashboard/aging"

export type OverviewKpis = {
  totalOutstandingAr: number
  totalOutstandingAp: number
  netWorkingCapital: number
  highPriorityOverdueCount: number
  highPriorityOverdueAmount: number
}

export type OverviewData = {
  kpis: OverviewKpis
  arAging: AgingBucket[]
  apAging: AgingBucket[]
  highPriorityItems: Array<
    AgedDocument & { kind: "invoice" | "bill"; daysPastDue: number }
  >
  error: string | null
}

export type AuditLogItem = {
  id: string
  org_id: string
  user_id: string | null
  action: string
  entity: string
  entity_id: string | null
  changes_json: Record<string, unknown>
  created_at: string
  user: {
    id: string
    email: string
    role: string
  } | null
}

export type AuditTrailData = {
  logs: AuditLogItem[]
  error: string | null
}

function toNumber(value: unknown) {
  const n = typeof value === "number" ? value : Number(value)
  return Number.isFinite(n) ? n : 0
}

function emptyOverview(error: string | null): OverviewData {
  return {
    kpis: {
      totalOutstandingAr: 0,
      totalOutstandingAp: 0,
      netWorkingCapital: 0,
      highPriorityOverdueCount: 0,
      highPriorityOverdueAmount: 0,
    },
    arAging: buildAgingSummary([]),
    apAging: buildAgingSummary([]),
    highPriorityItems: [],
    error,
  }
}

export async function getExecutiveOverview(): Promise<OverviewData> {
  const session = await getSessionClient()
  if (!session.ok) {
    return emptyOverview(session.error)
  }

  try {
    const { supabase } = session
    const asOf = new Date()

    const [invoicesResult, billsResult] = await Promise.all([
      supabase
        .from("invoices")
        .select(
          `
          id,
          invoice_number,
          balance_due,
          due_date,
          status,
          customer:contacts!invoices_customer_id_fkey ( name )
        `
        )
        .gt("balance_due", 0)
        .neq("status", "draft"),
      supabase
        .from("bills")
        .select(
          `
          id,
          bill_number,
          balance_due,
          due_date,
          status,
          vendor:contacts!bills_vendor_id_fkey ( name )
        `
        )
        .gt("balance_due", 0)
        .not("status", "in", "(draft,rejected)"),
    ])

    if (invoicesResult.error || billsResult.error) {
      return emptyOverview(
        invoicesResult.error?.message ??
          billsResult.error?.message ??
          "Failed to load overview data."
      )
    }

    const arDocs: AgedDocument[] = (invoicesResult.data ?? []).map((row) => {
      const customer = Array.isArray(row.customer)
        ? row.customer[0]
        : row.customer
      return {
        id: row.id as string,
        reference: row.invoice_number as string,
        partyName: (customer?.name as string | undefined) ?? "Unknown customer",
        dueDate: row.due_date as string,
        balanceDue: toNumber(row.balance_due),
        status: row.status as string,
      }
    })

    const apDocs: AgedDocument[] = (billsResult.data ?? []).map((row) => {
      const vendor = Array.isArray(row.vendor) ? row.vendor[0] : row.vendor
      return {
        id: row.id as string,
        reference: row.bill_number as string,
        partyName: (vendor?.name as string | undefined) ?? "Unknown vendor",
        dueDate: row.due_date as string,
        balanceDue: toNumber(row.balance_due),
        status: row.status as string,
      }
    })

    const totalOutstandingAr = arDocs.reduce(
      (sum, doc) => sum + doc.balanceDue,
      0
    )
    const totalOutstandingAp = apDocs.reduce(
      (sum, doc) => sum + doc.balanceDue,
      0
    )

    const highPriorityItems = [
      ...arDocs.map((doc) => ({
        ...doc,
        kind: "invoice" as const,
        daysPastDue: daysPastDue(doc.dueDate, asOf),
      })),
      ...apDocs.map((doc) => ({
        ...doc,
        kind: "bill" as const,
        daysPastDue: daysPastDue(doc.dueDate, asOf),
      })),
    ]
      .filter((doc) => isHighPriorityOverdue(doc.dueDate, asOf))
      .sort((a, b) => b.daysPastDue - a.daysPastDue)
      .slice(0, 8)

    const highPriorityOverdueAmount = highPriorityItems.reduce(
      (sum, doc) => sum + doc.balanceDue,
      0
    )

    return {
      kpis: {
        totalOutstandingAr,
        totalOutstandingAp,
        netWorkingCapital: totalOutstandingAr - totalOutstandingAp,
        highPriorityOverdueCount: highPriorityItems.length,
        highPriorityOverdueAmount,
      },
      arAging: buildAgingSummary(arDocs, asOf),
      apAging: buildAgingSummary(apDocs, asOf),
      highPriorityItems,
      error: null,
    }
  } catch (error) {
    return emptyOverview(
      error instanceof Error
        ? error.message
        : "Unable to load executive overview."
    )
  }
}

export async function getAuditTrail(limit = 50): Promise<AuditTrailData> {
  const session = await getSessionClient()
  if (!session.ok) {
    return { logs: [], error: session.error }
  }

  try {
    const { supabase } = session
    const { data, error } = await supabase
      .from("audit_logs")
      .select(
        `
        id,
        org_id,
        user_id,
        action,
        entity,
        entity_id,
        changes_json,
        created_at,
        user:users!audit_logs_user_id_fkey (
          id,
          email,
          role
        )
      `
      )
      .order("created_at", { ascending: false })
      .limit(limit)

    if (error) {
      return { logs: [], error: error.message }
    }

    const logs: AuditLogItem[] = (data ?? []).map((row) => {
      const userRaw = row.user
      const user = Array.isArray(userRaw) ? userRaw[0] : userRaw

      return {
        id: row.id as string,
        org_id: row.org_id as string,
        user_id: (row.user_id as string | null) ?? null,
        action: row.action as string,
        entity: row.entity as string,
        entity_id: (row.entity_id as string | null) ?? null,
        changes_json:
          (row.changes_json as Record<string, unknown> | null) ?? {},
        created_at: row.created_at as string,
        user: user
          ? {
              id: user.id as string,
              email: user.email as string,
              role: user.role as string,
            }
          : null,
      }
    })

    return { logs, error: null }
  } catch (error) {
    return {
      logs: [],
      error:
        error instanceof Error
          ? error.message
          : "Unable to load audit trail from Supabase.",
    }
  }
}

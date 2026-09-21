export type AgingBucketKey = "current" | "days_31_60" | "days_61_90" | "days_90_plus"

export type AgingBucket = {
  key: AgingBucketKey
  label: string
  count: number
  amount: number
}

export const AGING_BUCKET_DEFS: {
  key: AgingBucketKey
  label: string
}[] = [
  { key: "current", label: "Current (0-30 days)" },
  { key: "days_31_60", label: "31-60 days" },
  { key: "days_61_90", label: "61-90 days" },
  { key: "days_90_plus", label: "90+ days overdue" },
]

export type AgedDocument = {
  id: string
  reference: string
  partyName: string
  dueDate: string
  balanceDue: number
  status: string
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

/** Days past due date. Negative means not yet due. */
export function daysPastDue(dueDate: string, asOf: Date = new Date()) {
  const due = startOfDay(new Date(`${dueDate}T00:00:00`))
  const today = startOfDay(asOf)
  const diffMs = today.getTime() - due.getTime()
  return Math.floor(diffMs / (1000 * 60 * 60 * 24))
}

export function agingBucketForDaysPastDue(days: number): AgingBucketKey {
  if (days <= 30) return "current"
  if (days <= 60) return "days_31_60"
  if (days <= 90) return "days_61_90"
  return "days_90_plus"
}

export function buildAgingSummary(docs: AgedDocument[], asOf: Date = new Date()) {
  const buckets: Record<AgingBucketKey, AgingBucket> = {
    current: { key: "current", label: "Current (0-30 days)", count: 0, amount: 0 },
    days_31_60: { key: "days_31_60", label: "31-60 days", count: 0, amount: 0 },
    days_61_90: { key: "days_61_90", label: "61-90 days", count: 0, amount: 0 },
    days_90_plus: {
      key: "days_90_plus",
      label: "90+ days overdue",
      count: 0,
      amount: 0,
    },
  }

  for (const doc of docs) {
    if (doc.balanceDue <= 0) continue
    const days = daysPastDue(doc.dueDate, asOf)
    const key = agingBucketForDaysPastDue(days)
    buckets[key].count += 1
    buckets[key].amount += doc.balanceDue
  }

  return AGING_BUCKET_DEFS.map((def) => buckets[def.key])
}

export function isHighPriorityOverdue(dueDate: string, asOf: Date = new Date()) {
  return daysPastDue(dueDate, asOf) > 60
}

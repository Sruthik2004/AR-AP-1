import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  Scale,
} from "lucide-react"

import { formatINR } from "@/lib/currency"
import type { OverviewKpis } from "@/lib/dashboard/queries"
import { cn } from "@/lib/utils"

type OverviewKpiCardsProps = {
  kpis: OverviewKpis
}

export function OverviewKpiCards({ kpis }: OverviewKpiCardsProps) {
  const cards = [
    {
      label: "Total Outstanding AR",
      value: formatINR(kpis.totalOutstandingAr),
      hint: "Open customer balances",
      icon: ArrowUpRight,
    },
    {
      label: "Total Outstanding AP",
      value: formatINR(kpis.totalOutstandingAp),
      hint: "Open vendor balances",
      icon: ArrowDownRight,
    },
    {
      label: "Net Working Capital",
      value: formatINR(kpis.netWorkingCapital),
      hint: "AR − AP balance",
      icon: Scale,
      tone:
        kpis.netWorkingCapital >= 0
          ? "positive"
          : ("negative" as "positive" | "negative"),
    },
    {
      label: "High-Priority Overdue",
      value: String(kpis.highPriorityOverdueCount),
      hint: `${formatINR(kpis.highPriorityOverdueAmount)} past 60+ days`,
      icon: AlertTriangle,
      tone:
        kpis.highPriorityOverdueCount > 0
          ? ("warning" as const)
          : undefined,
    },
  ]

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => {
        const Icon = card.icon
        return (
          <div key={card.label} className="rounded-xl border bg-card p-4 shadow-xs">
            <div className="flex items-start justify-between gap-3">
              <p className="text-sm text-muted-foreground">{card.label}</p>
              <Icon
                className={cn(
                  "size-4 text-muted-foreground",
                  card.tone === "warning" && "text-amber-600",
                  card.tone === "negative" && "text-destructive",
                  card.tone === "positive" && "text-emerald-600"
                )}
              />
            </div>
            <p
              className={cn(
                "mt-2 text-2xl font-semibold tracking-tight tabular-nums",
                card.tone === "negative" && "text-destructive",
                card.tone === "positive" &&
                  "text-emerald-700 dark:text-emerald-400"
              )}
            >
              {card.value}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">{card.hint}</p>
          </div>
        )
      })}
    </div>
  )
}

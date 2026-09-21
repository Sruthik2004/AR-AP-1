"use client"

import { Progress } from "@/components/ui/progress"
import { formatINR } from "@/lib/currency"
import { calcPaymentProgress } from "@/types/invoices"

type PaymentProgressProps = {
  totalAmount: number
  balanceDue: number
}

export function PaymentProgress({
  totalAmount,
  balanceDue,
}: PaymentProgressProps) {
  const progress = calcPaymentProgress(totalAmount, balanceDue)
  const paid = Math.max(totalAmount - balanceDue, 0)

  return (
    <div className="min-w-36 space-y-1.5">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{progress}% paid</span>
        <span className="tabular-nums">{formatINR(paid)}</span>
      </div>
      <Progress value={progress} className="h-1.5" />
    </div>
  )
}

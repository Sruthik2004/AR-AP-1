import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { formatINR } from "@/lib/currency"
import type { AgingBucket } from "@/lib/dashboard/aging"

type AgingSummaryTableProps = {
  title: string
  description: string
  buckets: AgingBucket[]
}

export function AgingSummaryTable({
  title,
  description,
  buckets,
}: AgingSummaryTableProps) {
  const totalAmount = buckets.reduce((sum, bucket) => sum + bucket.amount, 0)
  const totalCount = buckets.reduce((sum, bucket) => sum + bucket.count, 0)

  return (
    <div className="rounded-xl border bg-card">
      <div className="border-b px-4 py-3">
        <h2 className="text-sm font-medium">{title}</h2>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Aging bracket</TableHead>
            <TableHead className="text-right">Items</TableHead>
            <TableHead className="text-right">Amount</TableHead>
            <TableHead className="text-right">Share</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {buckets.map((bucket) => {
            const share =
              totalAmount > 0
                ? Math.round((bucket.amount / totalAmount) * 100)
                : 0
            return (
              <TableRow key={bucket.key}>
                <TableCell className="font-medium">{bucket.label}</TableCell>
                <TableCell className="text-right tabular-nums">
                  {bucket.count}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatINR(bucket.amount)}
                </TableCell>
                <TableCell className="text-right tabular-nums text-muted-foreground">
                  {share}%
                </TableCell>
              </TableRow>
            )
          })}
          <TableRow>
            <TableCell className="font-semibold">Total</TableCell>
            <TableCell className="text-right font-semibold tabular-nums">
              {totalCount}
            </TableCell>
            <TableCell className="text-right font-semibold tabular-nums">
              {formatINR(totalAmount)}
            </TableCell>
            <TableCell className="text-right font-semibold tabular-nums">
              {totalAmount > 0 ? "100%" : "0%"}
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>
  )
}

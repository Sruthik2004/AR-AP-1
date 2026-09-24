import { formatINR } from "@/lib/currency"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

export function MoneyTable({
  columns,
  rows,
  empty,
}: {
  columns: string[]
  rows: (string | number | null)[][]
  empty: string
}) {
  if (rows.length === 0) {
    return (
      <p className="rounded-xl border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
        {empty}
      </p>
    )
  }

  return (
    <div className="rounded-xl border">
      <Table>
        <TableHeader>
          <TableRow>
            {columns.map((column) => (
              <TableHead
                key={column}
                className={column === "Amount" || column === "Debit" || column === "Credit" || column === "Rate" ? "text-right" : undefined}
              >
                {column}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row, index) => (
            <TableRow key={index}>
              {row.map((cell, cellIndex) => {
                const header = columns[cellIndex]
                const isMoney =
                  header === "Amount" || header === "Debit" || header === "Credit"
                const isRate = header === "Rate"
                return (
                  <TableCell
                    key={cellIndex}
                    className={isMoney || isRate ? "text-right tabular-nums" : undefined}
                  >
                    {isMoney && typeof cell === "number"
                      ? formatINR(cell)
                      : isRate && typeof cell === "number"
                        ? `${cell}%`
                        : (cell ?? "—")}
                  </TableCell>
                )
              })}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Loader2, Plus, Trash2 } from "lucide-react"

import { createInvoice } from "@/app/dashboard/ar/actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { formatINR } from "@/lib/currency"
import {
  GST_TAX_RATES,
  calcLineTotal,
  roundMoney,
} from "@/types/invoices"

type CustomerOption = {
  id: string
  name: string
  email: string | null
  currency: string
}

type LineItemDraft = {
  key: string
  description: string
  quantity: string
  unit_price: string
  tax_rate: string
}

type InvoiceCreateFormProps = {
  customers: CustomerOption[]
  customersError?: string | null
}

function createEmptyLine(): LineItemDraft {
  return {
    key: crypto.randomUUID(),
    description: "",
    quantity: "1",
    unit_price: "0",
    tax_rate: "18",
  }
}

function todayInputValue() {
  return new Date().toISOString().slice(0, 10)
}

function addDaysInputValue(days: number) {
  const date = new Date()
  date.setDate(date.getDate() + days)
  return date.toISOString().slice(0, 10)
}

function suggestInvoiceNumber() {
  const stamp = new Date()
  const y = stamp.getFullYear()
  const m = String(stamp.getMonth() + 1).padStart(2, "0")
  const d = String(stamp.getDate()).padStart(2, "0")
  const rand = String(Math.floor(Math.random() * 900) + 100)
  return `INV-${y}${m}${d}-${rand}`
}

export function InvoiceCreateForm({
  customers,
  customersError,
}: InvoiceCreateFormProps) {
  const router = useRouter()
  const [pending, setPending] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [customerId, setCustomerId] = React.useState("")
  const [status, setStatus] = React.useState<"draft" | "sent">("sent")
  const [invoiceNumber, setInvoiceNumber] = React.useState(suggestInvoiceNumber)
  const [issueDate, setIssueDate] = React.useState(todayInputValue)
  const [dueDate, setDueDate] = React.useState(() => addDaysInputValue(30))
  const [lines, setLines] = React.useState<LineItemDraft[]>([createEmptyLine()])

  const computedLines = lines.map((line) => {
    const quantity = Number(line.quantity) || 0
    const unitPrice = Number(line.unit_price) || 0
    const taxRate = Number(line.tax_rate) || 0
    const subtotal = roundMoney(quantity * unitPrice)
    const taxAmount = roundMoney((subtotal * taxRate) / 100)
    const lineTotal = calcLineTotal(quantity, unitPrice, taxRate)
    return { ...line, quantity, unitPrice, taxRate, subtotal, taxAmount, lineTotal }
  })

  const subtotal = roundMoney(
    computedLines.reduce((sum, line) => sum + line.subtotal, 0)
  )
  const taxTotal = roundMoney(
    computedLines.reduce((sum, line) => sum + line.taxAmount, 0)
  )
  const grandTotal = roundMoney(
    computedLines.reduce((sum, line) => sum + line.lineTotal, 0)
  )

  function updateLine(key: string, patch: Partial<LineItemDraft>) {
    setLines((prev) =>
      prev.map((line) => (line.key === key ? { ...line, ...patch } : line))
    )
  }

  function removeLine(key: string) {
    setLines((prev) =>
      prev.length === 1 ? prev : prev.filter((line) => line.key !== key)
    )
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setPending(true)
    setError(null)

    const result = await createInvoice({
      customer_id: customerId,
      invoice_number: invoiceNumber.trim(),
      issue_date: issueDate,
      due_date: dueDate,
      status,
      total_amount: grandTotal,
      items: computedLines.map((line) => ({
        description: line.description.trim(),
        quantity: line.quantity,
        unit_price: line.unitPrice,
        tax_rate: line.taxRate,
        line_total: line.lineTotal,
      })),
    })

    setPending(false)

    if (!result.success) {
      setError(result.error)
      return
    }

    router.push("/dashboard/ar")
    router.refresh()
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-6">
      {customersError ? (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-800 dark:text-amber-200">
          {customersError}
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="customer_id">Customer</Label>
          <Select
            value={customerId}
            onValueChange={(value) => {
              if (value) setCustomerId(value)
            }}
            disabled={pending || customers.length === 0}
          >
            <SelectTrigger id="customer_id" className="w-full">
              <SelectValue placeholder="Select customer" />
            </SelectTrigger>
            <SelectContent>
              {customers.map((customer) => (
                <SelectItem key={customer.id} value={customer.id}>
                  {customer.name}
                  {customer.email ? ` · ${customer.email}` : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {customers.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              No customers found.{" "}
              <Link
                href="/dashboard/contacts"
                className="underline underline-offset-2"
              >
                Add a customer contact
              </Link>{" "}
              first.
            </p>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor="invoice_number">Invoice number</Label>
          <Input
            id="invoice_number"
            value={invoiceNumber}
            onChange={(event) => setInvoiceNumber(event.target.value)}
            required
            disabled={pending}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="status">Status</Label>
          <Select
            value={status}
            onValueChange={(value) => {
              if (value === "draft" || value === "sent") setStatus(value)
            }}
            disabled={pending}
          >
            <SelectTrigger id="status" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="sent">Sent</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="issue_date">Issue date</Label>
          <Input
            id="issue_date"
            type="date"
            value={issueDate}
            onChange={(event) => setIssueDate(event.target.value)}
            required
            disabled={pending}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="due_date">Due date</Label>
          <Input
            id="due_date"
            type="date"
            value={dueDate}
            onChange={(event) => setDueDate(event.target.value)}
            required
            disabled={pending}
          />
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-medium">Line items</h2>
            <p className="text-xs text-muted-foreground">
              Quantity × unit rate, plus GST, rolls into the row total.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={pending}
            onClick={() => setLines((prev) => [...prev, createEmptyLine()])}
          >
            <Plus />
            Add line
          </Button>
        </div>

        <div className="rounded-xl border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-56">Item</TableHead>
                <TableHead className="w-28">Qty</TableHead>
                <TableHead className="w-36">Unit rate (₹)</TableHead>
                <TableHead className="w-32">Tax</TableHead>
                <TableHead className="w-36 text-right">Row total</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {computedLines.map((line) => (
                <TableRow key={line.key}>
                  <TableCell>
                    <Input
                      value={line.description}
                      onChange={(event) =>
                        updateLine(line.key, {
                          description: event.target.value,
                        })
                      }
                      placeholder="Consulting / product / service"
                      required
                      disabled={pending}
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      min={0.0001}
                      step="0.01"
                      value={line.quantity}
                      onChange={(event) =>
                        updateLine(line.key, { quantity: event.target.value })
                      }
                      required
                      disabled={pending}
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      min={0}
                      step="0.01"
                      value={line.unit_price}
                      onChange={(event) =>
                        updateLine(line.key, {
                          unit_price: event.target.value,
                        })
                      }
                      required
                      disabled={pending}
                    />
                  </TableCell>
                  <TableCell>
                    <Select
                      value={line.tax_rate}
                      onValueChange={(value) => {
                        if (value) updateLine(line.key, { tax_rate: value })
                      }}
                      disabled={pending}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {GST_TAX_RATES.map((rate) => (
                          <SelectItem key={rate} value={String(rate)}>
                            {rate}% GST
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="text-right font-medium tabular-nums">
                    {formatINR(line.lineTotal)}
                  </TableCell>
                  <TableCell>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      disabled={pending || lines.length === 1}
                      onClick={() => removeLine(line.key)}
                      aria-label="Remove line"
                    >
                      <Trash2 />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      <div className="ml-auto w-full max-w-sm space-y-2 rounded-xl border bg-muted/20 p-4">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Subtotal</span>
          <span className="tabular-nums">{formatINR(subtotal)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Tax</span>
          <span className="tabular-nums">{formatINR(taxTotal)}</span>
        </div>
        <div className="flex justify-between border-t pt-2 text-base font-semibold">
          <span>Grand total</span>
          <span className="tabular-nums">{formatINR(grandTotal)}</span>
        </div>
      </div>

      {error ? (
        <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center justify-end gap-2">
        <Button type="button" variant="outline" asChild disabled={pending}>
          <Link href="/dashboard/ar">Cancel</Link>
        </Button>
        <Button type="submit" disabled={pending || customers.length === 0}>
          {pending ? (
            <>
              <Loader2 className="animate-spin" />
              Creating…
            </>
          ) : (
            "Create invoice"
          )}
        </Button>
      </div>
    </form>
  )
}

"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"

import { recordInvoicePayment } from "@/app/dashboard/ar/actions"
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
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { formatINR } from "@/lib/currency"
import type { InvoiceListItem } from "@/types/invoices"

const PAYMENT_METHODS = [
  "Bank Transfer",
  "UPI",
  "Cheque",
  "Cash",
  "Card",
  "Other",
] as const

type RecordPaymentSheetProps = {
  invoice: InvoiceListItem
  trigger?: React.ReactNode
}

function todayInputValue() {
  return new Date().toISOString().slice(0, 10)
}

export function RecordPaymentSheet({
  invoice,
  trigger,
}: RecordPaymentSheetProps) {
  const router = useRouter()
  const [open, setOpen] = React.useState(false)
  const [pending, setPending] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [method, setMethod] = React.useState<string>("Bank Transfer")
  const [amount, setAmount] = React.useState(String(invoice.balance_due))

  React.useEffect(() => {
    if (open) {
      setAmount(String(invoice.balance_due))
      setError(null)
      setMethod("Bank Transfer")
    }
  }, [open, invoice.balance_due])

  const disabled = invoice.balance_due <= 0 || invoice.status === "draft"

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setPending(true)
    setError(null)

    const formData = new FormData(event.currentTarget)

    const result = await recordInvoicePayment({
      invoice_id: invoice.id,
      amount: Number(amount),
      payment_method: method,
      reference_code: String(formData.get("reference_code") ?? ""),
      paid_at: String(formData.get("paid_at") ?? todayInputValue()),
    })

    setPending(false)

    if (!result.success) {
      setError(result.error)
      return
    }

    setOpen(false)
    router.refresh()
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        {trigger ?? (
          <Button variant="outline" size="sm" disabled={disabled}>
            Log payment
          </Button>
        )}
      </SheetTrigger>
      <SheetContent side="right" className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Log payment</SheetTitle>
          <SheetDescription>
            Record a payment against invoice {invoice.invoice_number}. Balance
            due {formatINR(invoice.balance_due)}.
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={onSubmit} className="flex flex-1 flex-col gap-4 px-4">
          <div className="rounded-lg border bg-muted/30 p-3 text-sm">
            <div className="flex justify-between gap-3">
              <span className="text-muted-foreground">Customer</span>
              <span className="font-medium">
                {invoice.customer?.name ?? "—"}
              </span>
            </div>
            <div className="mt-1 flex justify-between gap-3">
              <span className="text-muted-foreground">Invoice total</span>
              <span className="tabular-nums">
                {formatINR(invoice.total_amount)}
              </span>
            </div>
            <div className="mt-1 flex justify-between gap-3">
              <span className="text-muted-foreground">Balance due</span>
              <span className="font-medium tabular-nums">
                {formatINR(invoice.balance_due)}
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor={`amount-${invoice.id}`}>Amount received (₹)</Label>
            <Input
              id={`amount-${invoice.id}`}
              name="amount"
              type="number"
              min={0.01}
              step="0.01"
              max={invoice.balance_due}
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              required
              disabled={pending}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor={`method-${invoice.id}`}>Payment method</Label>
            <Select
              value={method}
              onValueChange={(value) => {
                if (value) setMethod(value)
              }}
              disabled={pending}
            >
              <SelectTrigger id={`method-${invoice.id}`} className="w-full">
                <SelectValue placeholder="Select method" />
              </SelectTrigger>
              <SelectContent>
                {PAYMENT_METHODS.map((item) => (
                  <SelectItem key={item} value={item}>
                    {item}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor={`reference-${invoice.id}`}>Reference code</Label>
            <Input
              id={`reference-${invoice.id}`}
              name="reference_code"
              placeholder="UTR / cheque no. / txn id"
              disabled={pending}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor={`paid-at-${invoice.id}`}>Paid on</Label>
            <Input
              id={`paid-at-${invoice.id}`}
              name="paid_at"
              type="date"
              defaultValue={todayInputValue()}
              required
              disabled={pending}
            />
          </div>

          {error ? (
            <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          ) : null}

          <SheetFooter className="mt-auto px-0">
            <Button
              type="button"
              variant="outline"
              disabled={pending}
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={pending || disabled}>
              {pending ? (
                <>
                  <Loader2 className="animate-spin" />
                  Saving…
                </>
              ) : (
                "Record payment"
              )}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  )
}

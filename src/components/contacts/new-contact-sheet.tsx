"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"

import { createContact } from "@/app/dashboard/contacts/actions"
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
import { DEFAULT_CURRENCY } from "@/lib/currency"

const CURRENCY_OPTIONS = ["INR", "USD", "EUR", "GBP", "AED"] as const

export type CreatedContact = {
  id: string
  name: string
  email: string
  currency: string
  type: "customer" | "vendor"
}

type NewContactSheetProps = {
  trigger?: React.ReactNode
  defaultType?: "customer" | "vendor"
  lockType?: boolean
  onCreated?: (contact: CreatedContact) => void
}

export function NewContactSheet({
  trigger,
  defaultType = "customer",
  lockType = false,
  onCreated,
}: NewContactSheetProps) {
  const router = useRouter()
  const [open, setOpen] = React.useState(false)
  const [pending, setPending] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [type, setType] = React.useState<"customer" | "vendor">(defaultType)
  const [currency, setCurrency] = React.useState<string>(DEFAULT_CURRENCY)

  React.useEffect(() => {
    if (open) setType(defaultType)
  }, [open, defaultType])

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setPending(true)
    setError(null)

    const formData = new FormData(event.currentTarget)
    formData.set("type", type)
    formData.set("currency", currency)

    const result = await createContact(formData)

    setPending(false)

    if (!result.success) {
      setError(result.error)
      return
    }

    setOpen(false)
    setType(defaultType)
    setCurrency(DEFAULT_CURRENCY)
    event.currentTarget.reset()
    onCreated?.(result)
    router.refresh()
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        {trigger ?? <Button>New Contact</Button>}
      </SheetTrigger>
      <SheetContent side="right" className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle>
            {lockType
              ? defaultType === "vendor"
                ? "New vendor"
                : "New customer"
              : "New Contact"}
          </SheetTitle>
          <SheetDescription>
            {lockType && defaultType === "vendor"
              ? "Add a vendor, then they will be selected on this bill."
              : "Add a customer or vendor to your organization directory."}
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={onSubmit} className="flex flex-1 flex-col gap-4 px-4">
          <div className="space-y-2">
            <Label htmlFor="name">Contact Name</Label>
            <Input
              id="name"
              name="name"
              placeholder="Acme Supplies Pvt Ltd"
              required
              disabled={pending}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="type">Type</Label>
            <Select
              value={type}
              onValueChange={(value) => {
                if (value === "customer" || value === "vendor") {
                  setType(value)
                }
              }}
              disabled={pending || lockType}
            >
              <SelectTrigger id="type" className="w-full">
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="customer">Customer</SelectItem>
                <SelectItem value="vendor">Vendor</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Primary Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="ap@example.com"
              required
              disabled={pending}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Phone Number</Label>
            <Input
              id="phone"
              name="phone"
              type="tel"
              placeholder="+91 98765 43210"
              disabled={pending}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="tax_id">Tax ID / GSTIN</Label>
            <Input
              id="tax_id"
              name="tax_id"
              placeholder="22AAAAA0000A1Z5"
              disabled={pending}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="currency">Preferred Currency</Label>
            <Select
              value={currency}
              onValueChange={(value) => {
                if (value) setCurrency(value)
              }}
              disabled={pending}
            >
              <SelectTrigger id="currency" className="w-full">
                <SelectValue placeholder="Select currency" />
              </SelectTrigger>
              <SelectContent>
                {CURRENCY_OPTIONS.map((code) => (
                  <SelectItem key={code} value={code}>
                    {code}
                    {code === "INR" ? " (₹)" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
            <Button type="submit" disabled={pending}>
              {pending ? (
                <>
                  <Loader2 className="animate-spin" />
                  Saving…
                </>
              ) : (
                "Create Contact"
              )}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  )
}

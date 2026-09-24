"use client"

import * as React from "react"
import { useRouter } from "next/navigation"

import type { AccountRow } from "@/lib/accounting/queries"
import { roundMoney } from "@/types/invoices"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

import { createManualJournal } from "@/app/dashboard/accounting/actions"

type Line = { accountId: string; debit: string; credit: string }

const emptyLine = (): Line => ({ accountId: "", debit: "", credit: "" })

export function ManualJournalForm({ accounts }: { accounts: AccountRow[] }) {
  const router = useRouter()
  const postable = accounts.filter((account) => !account.isGroup)
  const [postingDate, setPostingDate] = React.useState(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Kolkata",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date())
  )
  const [description, setDescription] = React.useState("")
  const [lines, setLines] = React.useState<Line[]>([emptyLine(), emptyLine()])
  const [error, setError] = React.useState<string | null>(null)
  const [pending, startTransition] = React.useTransition()

  const debit = roundMoney(
    lines.reduce((sum, line) => sum + (Number(line.debit) || 0), 0)
  )
  const credit = roundMoney(
    lines.reduce((sum, line) => sum + (Number(line.credit) || 0), 0)
  )
  const balanced = debit > 0 && debit === credit

  function updateLine(index: number, patch: Partial<Line>) {
    setLines((current) =>
      current.map((line, lineIndex) =>
        lineIndex === index ? { ...line, ...patch } : line
      )
    )
  }

  function submit(event: React.FormEvent) {
    event.preventDefault()
    setError(null)
    startTransition(async () => {
      const result = await createManualJournal({
        postingDate,
        description,
        lines: lines.map((line) => ({
          accountId: line.accountId,
          debit: Number(line.debit) || 0,
          credit: Number(line.credit) || 0,
        })),
      })
      if (!result.success) {
        setError(result.error)
        return
      }
      router.push("/dashboard/accounting/journals")
      router.refresh()
    })
  }

  return (
    <form onSubmit={submit} className="flex max-w-4xl flex-col gap-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="posting-date">Posting date</Label>
          <Input
            id="posting-date"
            type="date"
            value={postingDate}
            onChange={(event) => setPostingDate(event.target.value)}
            required
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="description">Description</Label>
          <Input
            id="description"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Rent for September"
            required
            minLength={3}
            maxLength={200}
          />
        </div>
      </div>

      <div className="flex flex-col gap-3">
        {lines.map((line, index) => (
          <div key={index} className="grid gap-2 sm:grid-cols-[1fr_8rem_8rem_auto]">
            <select
              aria-label={`Account ${index + 1}`}
              className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm"
              value={line.accountId}
              onChange={(event) => updateLine(index, { accountId: event.target.value })}
              required
            >
              <option value="">Select account</option>
              {postable.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.code} · {account.name}
                </option>
              ))}
            </select>
            <Input
              aria-label={`Debit ${index + 1}`}
              inputMode="decimal"
              placeholder="Debit"
              value={line.debit}
              onChange={(event) => updateLine(index, { debit: event.target.value, credit: "" })}
            />
            <Input
              aria-label={`Credit ${index + 1}`}
              inputMode="decimal"
              placeholder="Credit"
              value={line.credit}
              onChange={(event) => updateLine(index, { credit: event.target.value, debit: "" })}
            />
            <Button
              type="button"
              variant="outline"
              disabled={lines.length <= 2}
              onClick={() =>
                setLines((current) => current.filter((_, lineIndex) => lineIndex !== index))
              }
            >
              Remove
            </Button>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
        <Button
          type="button"
          variant="outline"
          onClick={() => setLines((current) => [...current, emptyLine()])}
        >
          Add line
        </Button>
        <p className={balanced ? "text-foreground" : "text-muted-foreground"}>
          Debit {debit.toFixed(2)} · Credit {credit.toFixed(2)}
          {balanced ? " · Balanced" : " · Must match before posting"}
        </p>
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <Button type="submit" disabled={pending || !balanced} className="w-fit">
        {pending ? "Posting…" : "Post journal"}
      </Button>
    </form>
  )
}

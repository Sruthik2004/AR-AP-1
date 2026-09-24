import { roundMoney } from "@/types/invoices"

import type { AccountType } from "@/lib/accounting/codes"

export type LedgerRow = {
  code: string
  name: string
  accountType: AccountType
  debit: number
  credit: number
}

export type StatementLine = {
  code: string
  name: string
  amount: number
}

function signed(row: LedgerRow) {
  if (row.accountType === "asset" || row.accountType === "expense") {
    return roundMoney(row.debit - row.credit)
  }
  return roundMoney(row.credit - row.debit)
}

export function trialBalanceTotals(rows: LedgerRow[]) {
  return {
    debit: roundMoney(rows.reduce((sum, row) => sum + row.debit, 0)),
    credit: roundMoney(rows.reduce((sum, row) => sum + row.credit, 0)),
  }
}

export function profitAndLoss(rows: LedgerRow[]) {
  const revenue = rows
    .filter((row) => row.accountType === "revenue")
    .map((row) => ({ code: row.code, name: row.name, amount: signed(row) }))
    .filter((row) => row.amount !== 0)
  const expenses = rows
    .filter((row) => row.accountType === "expense")
    .map((row) => ({ code: row.code, name: row.name, amount: signed(row) }))
    .filter((row) => row.amount !== 0)

  const totalRevenue = roundMoney(revenue.reduce((sum, row) => sum + row.amount, 0))
  const totalExpenses = roundMoney(
    expenses.reduce((sum, row) => sum + row.amount, 0)
  )

  return {
    revenue,
    expenses,
    totalRevenue,
    totalExpenses,
    netProfit: roundMoney(totalRevenue - totalExpenses),
  }
}

export function balanceSheet(rows: LedgerRow[]) {
  const section = (type: AccountType) =>
    rows
      .filter((row) => row.accountType === type)
      .map((row) => ({ code: row.code, name: row.name, amount: signed(row) }))
      .filter((row) => row.amount !== 0)

  const assets = section("asset")
  const liabilities = section("liability")
  const equity = section("equity")
  const earnings = profitAndLoss(rows).netProfit

  const totalAssets = roundMoney(assets.reduce((sum, row) => sum + row.amount, 0))
  const totalLiabilities = roundMoney(
    liabilities.reduce((sum, row) => sum + row.amount, 0)
  )
  const totalEquity = roundMoney(
    equity.reduce((sum, row) => sum + row.amount, 0) + earnings
  )

  return {
    assets,
    liabilities,
    equity,
    earnings,
    totalAssets,
    totalLiabilities,
    totalEquity,
    totalLiabilitiesAndEquity: roundMoney(totalLiabilities + totalEquity),
  }
}

export function bankMovement(rows: LedgerRow[]) {
  const bank = rows.find((row) => row.code === "110000")
  const cashIn = bank?.debit ?? 0
  const cashOut = bank?.credit ?? 0
  return {
    cashIn,
    cashOut,
    net: roundMoney(cashIn - cashOut),
  }
}

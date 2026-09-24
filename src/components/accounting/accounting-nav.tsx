"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

import { cn } from "cn"

const links = [
  { href: "/dashboard/accounting", label: "Overview" },
  { href: "/dashboard/accounting/accounts", label: "Chart of accounts" },
  { href: "/dashboard/accounting/banks", label: "Banks" },
  { href: "/dashboard/accounting/tax", label: "Tax" },
  { href: "/dashboard/accounting/journals", label: "Journals" },
  { href: "/dashboard/accounting/trial-balance", label: "Trial balance" },
  { href: "/dashboard/accounting/profit-and-loss", label: "Profit & loss" },
  { href: "/dashboard/accounting/balance-sheet", label: "Balance sheet" },
  { href: "/dashboard/accounting/cash", label: "Cash" },
]

export function AccountingNav() {
  const pathname = usePathname()

  return (
    <nav className="flex gap-2 overflow-x-auto pb-1">
      {links.map((link) => {
        const active =
          link.href === "/dashboard/accounting"
            ? pathname === link.href
            : pathname === link.href || pathname.startsWith(`${link.href}/`)

        return (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              "shrink-0 rounded-lg border px-3 py-1.5 text-sm",
              active
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-background text-muted-foreground hover:text-foreground"
            )}
          >
            {link.label}
          </Link>
        )
      })}
    </nav>
  )
}

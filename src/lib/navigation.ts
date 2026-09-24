import {
  LayoutDashboard,
  HandCoins,
  Wallet,
  ClipboardCheck,
  Users,
  BookOpen,
  ScrollText,
  type LucideIcon,
} from "lucide-react"

export type NavItem = {
  title: string
  href: string
  icon: LucideIcon
  description?: string
}

export const mainNavItems: NavItem[] = [
  {
    title: "Overview",
    href: "/dashboard",
    icon: LayoutDashboard,
    description: "Executive dashboard and KPIs",
  },
  {
    title: "Accounts Receivable (AR)",
    href: "/dashboard/ar",
    icon: HandCoins,
    description: "Invoices, collections, and aging",
  },
  {
    title: "Accounts Payable (AP)",
    href: "/dashboard/ap",
    icon: Wallet,
    description: "Bills, payments, and vendor spend",
  },
  {
    title: "Approvals",
    href: "/dashboard/approvals",
    icon: ClipboardCheck,
    description: "Pending reviews and workflows",
  },
  {
    title: "Contacts (Vendors/Clients)",
    href: "/dashboard/contacts",
    icon: Users,
    description: "Vendors, clients, and directories",
  },
  {
    title: "Accounting",
    href: "/dashboard/accounting",
    icon: BookOpen,
    description: "Ledger, journals, and financial statements",
  },
  {
    title: "Audit Logs",
    href: "/dashboard/audit",
    icon: ScrollText,
    description: "System activity and compliance trail",
  },
]

"use client"

import * as React from "react"
import { Building2, Check, ChevronsUpDown, Plus } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

const organizations = [
  { id: "acme", name: "Acme Corporation", plan: "Enterprise" },
  { id: "northwind", name: "Northwind Trading", plan: "Business" },
  { id: "contoso", name: "Contoso Holdings", plan: "Enterprise" },
]

export function OrgSwitcher() {
  const [activeOrg, setActiveOrg] = React.useState(organizations[0])

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className="h-9 max-w-[220px] justify-between gap-2 px-2.5 font-normal"
        >
          <span className="flex min-w-0 items-center gap-2">
            <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-muted">
              <Building2 className="size-3.5" />
            </span>
            <span className="truncate text-sm font-medium">{activeOrg.name}</span>
          </span>
          <ChevronsUpDown className="size-3.5 shrink-0 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64">
        <DropdownMenuLabel>Organizations</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {organizations.map((org) => (
          <DropdownMenuItem
            key={org.id}
            onClick={() => setActiveOrg(org)}
            className="justify-between"
          >
            <span className="flex flex-col gap-0.5">
              <span className="font-medium">{org.name}</span>
              <span className="text-xs text-muted-foreground">{org.plan}</span>
            </span>
            {activeOrg.id === org.id ? (
              <Check className="size-4 text-foreground" />
            ) : null}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem>
          <Plus className="size-4" />
          Create organization
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

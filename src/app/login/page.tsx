import type { Metadata } from "next"
import { Building2 } from "lucide-react"

import { LoginForm } from "@/app/login/login-form"

export const metadata: Metadata = {
  title: "Sign in",
}

export default function LoginPage() {
  return (
    <main className="flex min-h-svh items-center justify-center bg-muted/30 p-6">
      <div className="w-full max-w-md rounded-2xl border bg-card p-6 shadow-xs">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Building2 className="size-5" />
          </div>
          <div>
            <h1 className="text-lg font-semibold tracking-tight">LedgerOps</h1>
            <p className="text-sm text-muted-foreground">
              Sign in to load invoices, bills, and audit logs.
            </p>
          </div>
        </div>
        <LoginForm />
      </div>
    </main>
  )
}

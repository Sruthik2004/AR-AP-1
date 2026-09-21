import { isSupabaseConfigured } from "@/lib/supabase/env"
import { createClient } from "@/lib/supabase/server"

export type UserRole = "admin" | "manager" | "accountant" | "auditor"

export type OrgContext = {
  supabase: Awaited<ReturnType<typeof createClient>>
  userId: string
  orgId: string
  role: UserRole
}

export type OrgContextResult =
  | { ok: true; ctx: OrgContext }
  | { ok: false; error: string }

export const SIGN_IN_REQUIRED =
  "Sign in to load live data. Open /login to create an account or sign in."

type SessionClientResult =
  | {
      ok: true
      supabase: Awaited<ReturnType<typeof createClient>>
      userId: string
    }
  | { ok: false; error: string }

export async function getSessionClient(): Promise<SessionClientResult> {
  if (!isSupabaseConfigured()) {
    return {
      ok: false,
      error:
        "Supabase is not configured. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY to .env.local.",
    }
  }

  const supabase = await createClient()
  const { data: claimsData, error: claimsError } =
    await supabase.auth.getClaims()

  const userId = claimsData?.claims?.sub
  if (claimsError || !userId) {
    return { ok: false, error: SIGN_IN_REQUIRED }
  }

  return { ok: true, supabase, userId }
}

export async function requireOrgContext(): Promise<OrgContextResult> {
  const session = await getSessionClient()
  if (!session.ok) return session

  const { supabase, userId } = session

  const { data: profile, error: profileError } = await supabase
    .from("users")
    .select("org_id, role")
    .eq("id", userId)
    .maybeSingle()

  if (profileError || !profile?.org_id) {
    return {
      ok: false,
      error:
        "No organization profile found for your user. Create an organization membership first.",
    }
  }

  return {
    ok: true,
    ctx: {
      supabase,
      userId,
      orgId: profile.org_id as string,
      role: profile.role as UserRole,
    },
  }
}

export function canApproveBills(role: UserRole) {
  return role === "admin" || role === "manager"
}

import { randomUUID } from "crypto"

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
      email: string
    }
  | { ok: false; error: string }

function claimString(value: unknown) {
  return typeof value === "string" ? value : ""
}

export async function ensureOrgProfile(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  email: string
) {
  const { data: existing } = await supabase
    .from("users")
    .select("id")
    .eq("id", userId)
    .maybeSingle()

  if (existing) return

  // Generate the org id in-app. Insert+select on organizations fails under RLS
  // because SELECT is scoped to private.user_org_id(), which is null until the
  // users row exists.
  const orgId = randomUUID()
  const { error: orgError } = await supabase.from("organizations").insert({
    id: orgId,
    name: "SBC LLP",
    base_currency: "INR",
  })

  if (orgError) {
    throw new Error(orgError.message)
  }

  const { error: profileError } = await supabase.from("users").insert({
    id: userId,
    org_id: orgId,
    email,
    role: "admin",
  })

  if (profileError) {
    throw new Error(profileError.message)
  }
}

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

  const userId = claimString(claimsData?.claims?.sub)
  if (claimsError || !userId) {
    return { ok: false, error: SIGN_IN_REQUIRED }
  }

  return {
    ok: true,
    supabase,
    userId,
    email: claimString(claimsData?.claims?.email),
  }
}

export async function requireOrgContext(): Promise<OrgContextResult> {
  const session = await getSessionClient()
  if (!session.ok) return session

  const { supabase, userId, email } = session

  const loadProfile = () =>
    supabase.from("users").select("org_id, role").eq("id", userId).maybeSingle()

  let { data: profile, error: profileError } = await loadProfile()

  if (!profile?.org_id && email) {
    try {
      await ensureOrgProfile(supabase, userId, email)
      ;({ data: profile, error: profileError } = await loadProfile())
    } catch (err) {
      return {
        ok: false,
        error:
          err instanceof Error
            ? err.message
            : "Could not create an organization membership for this user.",
      }
    }
  }

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

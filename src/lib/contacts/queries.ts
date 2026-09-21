import { getSessionClient } from "@/lib/auth/org"
import type { Contact } from "@/types/contacts"

export type ContactsQueryResult = {
  contacts: Contact[]
  error: string | null
}

export async function getContacts(): Promise<ContactsQueryResult> {
  const session = await getSessionClient()
  if (!session.ok) {
    return { contacts: [], error: session.error }
  }

  try {
    const { supabase } = session
    const { data, error } = await supabase
      .from("contacts")
      .select(
        "id, org_id, type, name, email, phone, tax_id, currency, created_at, updated_at"
      )
      .order("name", { ascending: true })

    if (error) {
      return { contacts: [], error: error.message }
    }

    return { contacts: (data ?? []) as Contact[], error: null }
  } catch (error) {
    return {
      contacts: [],
      error:
        error instanceof Error
          ? error.message
          : "Unable to load contacts from Supabase.",
    }
  }
}

export type ContactType = "customer" | "vendor"

export type Contact = {
  id: string
  org_id: string
  type: ContactType
  name: string
  email: string | null
  phone: string | null
  tax_id: string | null
  currency: string
  created_at: string
  updated_at: string
}

export type CreateContactInput = {
  name: string
  type: ContactType
  email: string
  phone: string
  tax_id: string
  currency: string
}

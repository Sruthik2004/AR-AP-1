import type { Metadata } from "next"

import { ContactsDataTable } from "@/components/contacts/contacts-data-table"
import { PageShell } from "@/components/layout/page-shell"
import { getContacts } from "@/lib/contacts/queries"

export const metadata: Metadata = {
  title: "Contacts",
}

export default async function DashboardContactsPage() {
  const { contacts, error } = await getContacts()

  return (
    <PageShell
      title="Contacts (Vendors/Clients)"
      description="Manage customers and vendors across your organization."
    >
      <ContactsDataTable data={contacts} error={error} />
    </PageShell>
  )
}

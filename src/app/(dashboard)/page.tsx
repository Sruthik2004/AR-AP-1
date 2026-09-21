import { redirect } from "next/navigation"

export default function RootOverviewRedirectPage() {
  redirect("/dashboard")
}

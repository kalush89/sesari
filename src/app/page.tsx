import { getAuthSession } from "@/lib/auth/session"
import { redirect } from "next/navigation"

export default async function Home() {
  const session = await getAuthSession()

  if (session) {
    redirect("/dashboard")
  } else {
    redirect("/signin")
  }
}

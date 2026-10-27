import { redirect } from "next/navigation"
import { auth } from "@/auth"

// The signed-in user's Candy Rain ID subject, or null when signed out.
export async function getSub(): Promise<string | null> {
  const session = await auth()
  return session?.user?.id ?? null
}

export async function requireSub(): Promise<string> {
  const sub = await getSub()
  if (!sub) redirect("/")
  return sub
}

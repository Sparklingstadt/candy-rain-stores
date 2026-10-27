import { redirect } from "next/navigation"
import { auth } from "@/auth"
import { safeReturnTo } from "@/lib/safeReturnTo"

export type Buyer = { sub: string; name: string; email: string }

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

export async function getBuyer(): Promise<Buyer | null> {
  const session = await auth()
  const user = session?.user
  if (!user?.id) return null
  return { sub: user.id, name: user.name ?? "", email: user.email ?? "" }
}

// Signed out: sign in, then come back to redirectTo (same-site paths only).
// signIn() cannot set cookies during a page render, so go through a route handler.
export async function requireBuyer(redirectTo: string): Promise<Buyer> {
  const buyer = await getBuyer()
  if (buyer) return buyer
  redirect(`/api/buyer-login?returnTo=${encodeURIComponent(safeReturnTo(redirectTo))}`)
}

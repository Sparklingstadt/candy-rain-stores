export type Buyer = { sub: string; name: string; email: string; image: string | null }

type SessionUser = { id?: string | null; name?: string | null; email?: string | null; image?: string | null }

// The signed-in buyer from the Auth.js session user, or null without a subject.
export function toBuyer(user: SessionUser | null | undefined): Buyer | null {
  if (!user?.id) return null
  return { sub: user.id, name: user.name ?? "", email: user.email ?? "", image: user.image || null }
}

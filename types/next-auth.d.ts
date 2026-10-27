import type { DefaultSession } from "next-auth"

declare module "next-auth" {
  interface Session {
    user: {
      // Candy Rain ID subject
      id: string
    } & DefaultSession["user"]
  }
}

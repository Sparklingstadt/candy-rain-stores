"use client"

import { signOut } from "next-auth/react"
import { Button } from "@/components/ui/button"

export function SignOutButton() {
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={() => signOut({ redirectTo: "/api/signout-redirect" })}
    >
      ログアウト
    </Button>
  )
}

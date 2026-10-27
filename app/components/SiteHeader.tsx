import Link from "next/link"
import { deps } from "@/app/dashboard/deps"
import { signInToBuyAction } from "@/app/cart/actions"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { getBuyer } from "@/lib/session"
import { countCartItems } from "@/services/cartService"
import { SignOutButton } from "./SignOutButton"

// path: the page the header is on, so signing in brings the buyer back here.
export async function SiteHeader({ path }: { path: string }) {
  const buyer = await getBuyer()
  const count = buyer ? await countCartItems(deps(), buyer.sub) : 0
  return (
    <header className="bg-background flex flex-wrap items-center justify-between gap-x-3 gap-y-1 border-b px-4 py-2 text-sm">
      <Link href="/" className="font-semibold tracking-tight">
        Candy Rain Stores
      </Link>
      <nav className="flex flex-wrap items-center gap-1">
        <Button asChild variant="ghost" size="sm">
          {/* The parentheses stay in the text (screen readers and copy read "カート（N）"); the badge shows N. */}
          <Link href="/cart">
            カート<span className="sr-only">（</span>
            <Badge variant="secondary" className="min-w-5 tabular-nums">
              {count}
            </Badge>
            <span className="sr-only">）</span>
          </Link>
        </Button>
        <Button asChild variant="ghost" size="sm">
          <Link href="/orders">注文履歴</Link>
        </Button>
        {buyer ? (
          <SignOutButton />
        ) : (
          <form action={signInToBuyAction.bind(null, path)}>
            <Button type="submit" variant="outline" size="sm">
              ログイン
            </Button>
          </form>
        )}
      </nav>
    </header>
  )
}

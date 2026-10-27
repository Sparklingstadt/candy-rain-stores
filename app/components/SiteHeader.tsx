import Link from "next/link"
import { deps } from "@/app/dashboard/deps"
import { signInToBuyAction } from "@/app/cart/actions"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { getBuyer } from "@/lib/session"
import { countCartItems } from "@/services/cartService"
import { UserMenu } from "./UserMenu"
import { Brand } from "./atelier/Brand"
import { ShoppingBagIcon } from "lucide-react"

// path: the page the header is on, so signing in brings the buyer back here.
export async function SiteHeader({ path }: { path: string }) {
  const buyer = await getBuyer()
  const count = buyer ? await countCartItems(deps(), buyer.sub) : 0
  return (
    <header className="bg-card/80 border-b">
      <div className="mx-auto flex min-h-20 max-w-7xl flex-wrap items-center justify-between gap-3 px-5 py-4 text-sm sm:px-8 lg:px-12">
      <Brand />
      <nav aria-label="アカウントとお買い物" className="flex flex-wrap items-center gap-1">
        <Button asChild variant="ghost" size="sm">
          {/* The parentheses stay in the text (screen readers and copy read "カート（N）"); the badge shows N. */}
          <Link href="/cart">
            <ShoppingBagIcon aria-hidden />
            カート<span className="sr-only">（</span>
            <Badge variant="secondary" className="min-w-5 tabular-nums">
              {count}
            </Badge>
            <span className="sr-only">）</span>
          </Link>
        </Button>
        {buyer ? (
          <UserMenu label={buyer.name.trim() || buyer.email} />
        ) : (
          <>
            <Button asChild variant="ghost" size="sm">
              <Link href="/orders">注文履歴</Link>
            </Button>
            <form action={signInToBuyAction.bind(null, path)}>
              <Button type="submit" variant="outline" size="sm">
                ログイン
              </Button>
            </form>
          </>
        )}
      </nav>
      </div>
    </header>
  )
}

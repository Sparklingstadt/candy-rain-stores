import Link from "next/link"
import { ShoppingBagIcon } from "lucide-react"
import { Brand } from "./atelier/Brand"
import { deps } from "@/app/dashboard/deps"
import { signInToBuyAction } from "@/app/cart/actions"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { getBuyer } from "@/lib/session"
import { countCartItems } from "@/services/cartService"
import { UserMenu } from "./UserMenu"

// path: the page the header is on, so signing in brings the buyer back here.
export async function SiteHeader({ path }: { path: string }) {
  const buyer = await getBuyer()
  const count = buyer ? await countCartItems(deps(), buyer.sub) : 0
  return (
    <header className="bg-card/80 border-b text-sm">
      <div className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-x-5 gap-y-3 px-5 py-4 sm:px-8">
        <Brand href="/stores" />
        <nav className="flex flex-wrap items-center gap-1">
          <Button asChild variant="ghost" size="sm">
            {/* The parentheses stay in the text (screen readers and copy read "カート（N）"); the badge shows N. */}
            <Link href="/cart">
              <ShoppingBagIcon aria-hidden="true" className="size-4" />
              カート<span className="sr-only">（</span>
              <Badge variant="secondary" className="min-w-5 tabular-nums">
                {count}
              </Badge>
              <span className="sr-only">）</span>
            </Link>
          </Button>
          {buyer ? (
            <UserMenu name={buyer.name.trim()} email={buyer.email} image={buyer.image} />
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

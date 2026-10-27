import Link from "next/link"
import { deps } from "@/app/dashboard/deps"
import { signInToBuyAction } from "@/app/cart/actions"
import { getBuyer } from "@/lib/session"
import { countCartItems } from "@/services/cartService"
import { SignOutButton } from "./SignOutButton"

// path: the page the header is on, so signing in brings the buyer back here.
export async function SiteHeader({ path }: { path: string }) {
  const buyer = await getBuyer()
  const count = buyer ? await countCartItems(deps(), buyer.sub) : 0
  return (
    <header className="flex flex-wrap items-center justify-between gap-3 border-b bg-white px-4 py-2 text-sm">
      <Link href="/" className="font-bold">
        Candy Rain Stores
      </Link>
      <nav className="flex flex-wrap items-center gap-4">
        <Link href="/cart">カート（{count}）</Link>
        <Link href="/orders">注文履歴</Link>
        {buyer ? (
          <SignOutButton />
        ) : (
          <form action={signInToBuyAction.bind(null, path)}>
            <button type="submit">ログイン</button>
          </form>
        )}
      </nav>
    </header>
  )
}

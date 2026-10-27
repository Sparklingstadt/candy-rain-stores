import type { Metadata } from "next"
import Link from "next/link"
import { deps } from "@/app/dashboard/deps"
import { SiteHeader } from "@/app/components/SiteHeader"
import { formatPrice } from "@/lib/formatPrice"
import { requireBuyer } from "@/lib/session"
import { getCart, type CartLine } from "@/services/cartService"
import { CartLineControls } from "./CartLineControls"

export const metadata: Metadata = { title: "カート" }

function problemText(line: CartLine): string | null {
  switch (line.problem) {
    case "unavailable":
      return "現在購入できません"
    case "insufficient_stock":
      return `在庫が足りません（残り ${line.stock} 点）`
    case "own_store":
      return "自分のストアの商品は購入できません"
    default:
      return null
  }
}

export default async function CartPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const buyer = await requireBuyer("/cart")
  const { error } = await searchParams
  const cart = await getCart(deps(), buyer.sub)

  return (
    <>
      <SiteHeader path="/cart" />
      <main className="mx-auto max-w-2xl space-y-6 p-4">
        <h1 className="text-2xl font-bold">カート</h1>
        {error === "changed" && (
          <p role="alert" className="text-red-700">
            在庫や公開状態が変わったため、注文を確定できませんでした
          </p>
        )}
        {cart.groups.length === 0 ? (
          <p>カートは空です</p>
        ) : (
          <>
            {cart.groups.map((group) => (
              <section key={group.storeId} className="space-y-3">
                <h2 className="text-lg font-bold">
                  <Link href={`/s/${group.storeSlug}`} className="underline">
                    {group.storeName}
                  </Link>
                </h2>
                <ul className="space-y-3">
                  {group.lines.map((line) => {
                    const problem = problemText(line)
                    return (
                      <li key={line.itemId} className="flex gap-3 border-b pb-3">
                        {line.imageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={line.imageUrl} alt="" className="h-16 w-16 rounded object-cover" />
                        ) : (
                          <div className="h-16 w-16 rounded bg-gray-200" />
                        )}
                        <div className="flex-1 space-y-1">
                          <Link
                            href={`/s/${group.storeSlug}/products/${line.productId}`}
                            className="font-bold underline"
                          >
                            {line.productName}
                          </Link>
                          <p>{formatPrice(line.unitPrice)}</p>
                          {problem && (
                            <p role="alert" className="text-red-700">
                              {problem}
                            </p>
                          )}
                          <CartLineControls
                            itemId={line.itemId}
                            quantity={line.quantity}
                            name={line.productName}
                          />
                          <p>小計 {formatPrice(line.unitPrice * line.quantity)}</p>
                        </div>
                      </li>
                    )
                  })}
                </ul>
                <p className="text-right">{group.storeName}の小計 {formatPrice(group.subtotal)}</p>
              </section>
            ))}
            <p className="text-right text-xl font-bold">合計 {formatPrice(cart.total)}</p>
            <div className="space-y-2">
              {cart.hasProblems ? (
                <>
                  <span
                    aria-disabled="true"
                    className="inline-block cursor-not-allowed rounded border px-4 py-2 opacity-50"
                  >
                    注文手続きへ
                  </span>
                  <p className="text-red-700">購入できない商品があります。数量を変えるか削除してください</p>
                </>
              ) : (
                <Link href="/checkout" className="inline-block rounded border px-4 py-2">
                  注文手続きへ
                </Link>
              )}
            </div>
          </>
        )}
      </main>
    </>
  )
}

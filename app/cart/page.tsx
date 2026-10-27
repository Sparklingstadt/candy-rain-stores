import type { Metadata } from "next"
import Link from "next/link"
import { deps } from "@/app/dashboard/deps"
import { CircleAlertIcon } from "lucide-react"
import { SiteHeader } from "@/app/components/SiteHeader"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button, buttonVariants } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { formatPrice } from "@/lib/formatPrice"
import { requireBuyer } from "@/lib/session"
import { showChangedNotice } from "@/lib/cartNotice"
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

export default async function CartPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string | string[]; v?: string | string[] }>
}) {
  const buyer = await requireBuyer("/cart")
  const params = await searchParams
  const cart = await getCart(deps(), buyer.sub)

  return (
    <>
      <SiteHeader path="/cart" />
      <main className="mx-auto max-w-2xl space-y-6 p-4">
        <h1 className="text-2xl font-bold">カート</h1>
        {showChangedNotice(params, cart) && (
          <Alert variant="destructive">
            <CircleAlertIcon />
            <AlertDescription className="text-destructive">
              在庫や公開状態が変わったため、注文を確定できませんでした
            </AlertDescription>
          </Alert>
        )}
        {cart.groups.length === 0 ? (
          <p>カートは空です</p>
        ) : (
          <>
            {cart.groups.map((group) => (
              <Card key={group.storeId}>
                <CardHeader>
                  <CardTitle>
                    <h2 className="text-lg font-bold">
                      {group.storePublished ? (
                        <Link href={`/s/${group.storeSlug}`} className="underline underline-offset-4">
                          {group.storeName}
                        </Link>
                      ) : (
                        group.storeName
                      )}
                    </h2>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="divide-y">
                    {group.lines.map((line) => {
                      const problem = problemText(line)
                      return (
                        <li key={line.itemId} className="flex gap-3 py-3 first:pt-0 last:pb-0">
                          {line.imageUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={line.imageUrl} alt="" className="h-16 w-16 shrink-0 rounded-md object-cover" />
                          ) : (
                            <div className="bg-muted h-16 w-16 shrink-0 rounded-md" />
                          )}
                          <div className="min-w-0 flex-1 space-y-1">
                            {group.storePublished && line.productPublished ? (
                              <Link
                                href={`/s/${group.storeSlug}/products/${line.productId}`}
                                className="font-bold underline underline-offset-4"
                              >
                                {line.productName}
                              </Link>
                            ) : (
                              <span className="font-bold">{line.productName}</span>
                            )}
                            <p>{formatPrice(line.unitPrice)}</p>
                            {problem && (
                              <p role="alert" className="text-destructive text-sm">
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
                </CardContent>
                <CardFooter className="justify-end">
                  <p>{group.storeName}の小計 {formatPrice(group.subtotal)}</p>
                </CardFooter>
              </Card>
            ))}
            <p className="text-right text-xl font-bold">合計 {formatPrice(cart.total)}</p>
            <div className="space-y-2">
              {cart.hasProblems ? (
                <>
                  <span
                    aria-disabled="true"
                    className={cn(buttonVariants(), "cursor-not-allowed opacity-50")}
                  >
                    注文手続きへ
                  </span>
                  <p className="text-destructive text-sm">購入できない商品があります。数量を変えるか削除してください</p>
                </>
              ) : (
                <Button asChild>
                  <Link href="/checkout">注文手続きへ</Link>
                </Button>
              )}
            </div>
          </>
        )}
      </main>
    </>
  )
}

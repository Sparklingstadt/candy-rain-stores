import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { deps } from "@/app/dashboard/deps"
import { SiteHeader } from "@/app/components/SiteHeader"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { formatPrice } from "@/lib/formatPrice"
import { requireBuyer } from "@/lib/session"
import { getCart } from "@/services/cartService"
import { getLastShipping } from "@/services/orderService"
import { CheckoutForm } from "./CheckoutForm"

export const metadata: Metadata = { title: "注文手続き" }

export default async function CheckoutPage() {
  const buyer = await requireBuyer("/checkout")
  const cart = await getCart(deps(), buyer.sub)
  if (cart.groups.length === 0 || cart.hasProblems) redirect("/cart")
  const last = await getLastShipping(deps(), buyer.sub)

  return (
    <>
      <SiteHeader path="/checkout" />
      <main className="mx-auto max-w-2xl space-y-6 p-4">
        <h1 className="text-2xl font-bold">注文手続き</h1>
        <p className="text-muted-foreground text-sm">ストアごとに注文が作られます。</p>
        {cart.groups.map((group) => (
          <Card key={group.storeId}>
            <CardHeader>
              <CardTitle>
                <h2 className="text-lg font-bold">{group.storeName}</h2>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <ul className="space-y-1">
                {group.lines.map((line) => (
                  <li key={line.itemId} className="flex justify-between gap-2">
                    <span>
                      {line.productName} × {line.quantity}
                    </span>
                    <span>{formatPrice(line.unitPrice * line.quantity)}</span>
                  </li>
                ))}
              </ul>
              <div className="space-y-1">
                <h3 className="text-sm font-medium">お支払い方法</h3>
                <p className="text-muted-foreground text-sm whitespace-pre-line">
                  {group.paymentInstructions ?? "お支払い方法はストアからの連絡をお待ちください"}
                </p>
              </div>
            </CardContent>
            <CardFooter className="justify-end">
              <p>{group.storeName}の小計 {formatPrice(group.subtotal)}</p>
            </CardFooter>
          </Card>
        ))}
        <p className="text-right text-xl font-bold">合計 {formatPrice(cart.total)}</p>
        <CheckoutForm
          initial={last ?? { postalCode: "", prefecture: "", address: "", phone: "" }}
          cartVersion={cart.version}
        />
      </main>
    </>
  )
}

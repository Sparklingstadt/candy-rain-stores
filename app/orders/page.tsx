import type { Metadata } from "next"
import Link from "next/link"
import { deps } from "@/app/dashboard/deps"
import { CircleCheckIcon } from "lucide-react"
import { SiteHeader } from "@/app/components/SiteHeader"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { OrderStatusBadge } from "@/app/components/OrderStatusBadge"
import { Card, CardContent } from "@/components/ui/card"
import { formatPrice } from "@/lib/formatPrice"
import { formatOrderDate, orderNumber } from "@/lib/orderStatus"
import { requireBuyer } from "@/lib/session"
import { listBuyerOrders } from "@/services/orderService"

export const metadata: Metadata = { title: "注文履歴" }

export default async function OrdersPage({ searchParams }: { searchParams: Promise<{ placed?: string }> }) {
  const buyer = await requireBuyer("/orders")
  const { placed } = await searchParams
  const orders = await listBuyerOrders(deps(), buyer.sub)

  return (
    <>
      <SiteHeader path="/orders" />
      <main className="mx-auto max-w-2xl space-y-6 p-4">
        <h1 className="text-2xl font-bold">注文履歴</h1>
        {placed === "1" && (
          <Alert
            role="status"
            className="border-green-300 text-green-800 dark:border-green-800 dark:text-green-300"
          >
            <CircleCheckIcon />
            <AlertDescription className="text-green-800 dark:text-green-300">
              ご注文を受け付けました。ストアごとに注文が作られています。お支払い方法は各注文の案内をご確認ください
            </AlertDescription>
          </Alert>
        )}
        {orders.length === 0 ? (
          <p>まだ注文がありません</p>
        ) : (
          <ul className="space-y-3">
            {orders.map((order) => (
              <li key={order.id}>
                <Card className="gap-0 py-4">
                  <CardContent className="space-y-1 px-4">
                    <Link href={`/orders/${order.id}`} className="font-bold underline underline-offset-4">
                      注文番号 {orderNumber(order.id)}
                    </Link>
                    <p>{order.storeName}</p>
                    <p className="text-muted-foreground text-sm">{formatOrderDate(order.createdAt)}</p>
                    <p className="flex flex-wrap items-center gap-2">
                      {formatPrice(order.totalAmount)}
                      <OrderStatusBadge status={order.status} />
                    </p>
                  </CardContent>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </main>
    </>
  )
}

import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { deps } from "@/app/dashboard/deps"
import { OrderStatusBadge } from "@/app/components/OrderStatusBadge"
import { SiteHeader } from "@/app/components/SiteHeader"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { formatPrice } from "@/lib/formatPrice"
import { formatOrderDate, orderNumber } from "@/lib/orderStatus"
import { requireBuyer } from "@/lib/session"
import { getBuyerOrder } from "@/services/orderService"
import { isUuid } from "@/services/productService"
import { CancelOrderForm } from "./CancelOrderForm"

export const metadata: Metadata = { title: "注文の詳細" }

export default async function OrderPage({ params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = await params
  const buyer = await requireBuyer("/orders/" + orderId)
  if (!isUuid(orderId)) notFound()
  const order = await getBuyerOrder(deps(), buyer.sub, orderId)
  if (!order) notFound()
  const { store } = order

  return (
    <>
      <SiteHeader path={`/orders/${order.id}`} />
      <main className="mx-auto max-w-2xl space-y-6 p-4">
        <h1 className="text-2xl font-bold">注文番号 {orderNumber(order.id)}</h1>
        <dl className="space-y-1">
          <div>
            <dt className="inline font-medium">ストア：</dt>
            <dd className="inline">
              {store?.isPublished ? (
                <Link href={`/s/${store.slug}`} className="underline underline-offset-4">
                  {order.storeName}
                </Link>
              ) : (
                order.storeName
              )}
            </dd>
          </div>
          <div>
            <dt className="inline font-medium">注文日時：</dt>
            <dd className="inline">{formatOrderDate(order.createdAt)}</dd>
          </div>
          <div>
            <dt className="inline font-medium">状態：</dt>
            <dd className="inline">
              <OrderStatusBadge status={order.status} />
            </dd>
          </div>
        </dl>

        <Card>
          <CardHeader>
            <CardTitle>
              <h2 className="text-lg font-bold">注文内容</h2>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <ul className="space-y-1">
              {order.items.map((item) => (
                <li key={item.id} className="flex justify-between gap-2">
                  <span>
                    {item.productName}（{formatPrice(item.unitPrice)}）× {item.quantity}
                  </span>
                  <span>{formatPrice(item.unitPrice * item.quantity)}</span>
                </li>
              ))}
            </ul>
            <Separator />
            <p className="text-right text-xl font-bold">合計 {formatPrice(order.totalAmount)}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>
              <h2 className="text-lg font-bold">お届け先</h2>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            <p>〒{order.postalCode}</p>
            <p>
              {order.prefecture}
              {order.address}
            </p>
            <p>電話番号 {order.phone}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>
              <h2 className="text-lg font-bold">お支払い方法</h2>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-line">
              {order.paymentInstructions ?? "お支払い方法はストアからの連絡をお待ちください"}
            </p>
          </CardContent>
        </Card>

        {order.status === "RECEIVED" && <CancelOrderForm orderId={order.id} />}
        <Button asChild variant="outline">
          <Link href="/orders">注文履歴へ戻る</Link>
        </Button>
      </main>
    </>
  )
}

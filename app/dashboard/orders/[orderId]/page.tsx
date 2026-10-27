import type { Metadata } from "next"
import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import { OrderStatusBadge } from "@/app/components/OrderStatusBadge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { formatPrice } from "@/lib/formatPrice"
import { formatOrderDate, nextOwnerStatuses, orderNumber } from "@/lib/orderStatus"
import { requireSub } from "@/lib/session"
import { getStoreOrder } from "@/services/orderService"
import { isUuid } from "@/services/productService"
import { getOwnStore } from "@/services/storeService"
import { deps } from "../../deps"
import { OrderStatusButtons } from "../OrderStatusButtons"

export const metadata: Metadata = { title: "注文の詳細" }

export default async function OrderPage({ params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = await params
  const sub = await requireSub()
  const store = await getOwnStore(deps(), sub)
  if (!store) redirect("/dashboard")
  if (!isUuid(orderId)) notFound()
  const order = await getStoreOrder(deps(), sub, orderId)
  if (!order) notFound()

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-4">
      <h1 className="text-2xl font-bold">注文番号 {orderNumber(order.id)}</h1>
      <dl className="space-y-1">
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
            <h2 className="text-lg font-bold">購入者</h2>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-1">
          <p>お名前 {order.buyerName}</p>
          <p>メールアドレス {order.buyerEmail}</p>
          <p>電話番号 {order.phone}</p>
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
        </CardContent>
      </Card>

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

      <OrderStatusButtons orderId={order.id} next={nextOwnerStatuses(order.status)} />

      <div>
        <Button asChild variant="outline">
          <Link href="/dashboard/orders">注文一覧へ戻る</Link>
        </Button>
      </div>
    </div>
  )
}

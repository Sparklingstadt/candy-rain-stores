import type { Metadata } from "next"
import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import { OrderStatusBadge } from "@/app/components/OrderStatusBadge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { formatPrice } from "@/lib/formatPrice"
import { formatOrderDate, nextOwnerStatuses, orderNumber, paymentDeadline } from "@/lib/orderStatus"
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
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold">注文番号 {orderNumber(order.id)}</h1>
        <p className="text-muted-foreground text-sm">注文日時：{formatOrderDate(order.createdAt)}</p>
        {order.status === "RECEIVED" && (
          <p className="text-muted-foreground text-sm">
            お支払い期限：{formatOrderDate(paymentDeadline(order.createdAt))}
            （それまでに支払確認しないと、自動でキャンセルされ在庫が戻ります）
          </p>
        )}
      </header>

      <div className="flex flex-wrap items-start gap-6">
        <div className="flex min-w-0 flex-[999_1_100%] flex-col gap-6 lg:flex-[999_1_480px]">
          <Card>
            <CardHeader>
              <CardTitle>
                <h2 className="text-lg font-bold">購入者</h2>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 wrap-anywhere">
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
            <CardContent className="space-y-1 wrap-anywhere">
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
                    <span className="wrap-anywhere">
                      {item.productName}（{formatPrice(item.unitPrice)}）× {item.quantity}
                    </span>
                    <span className="shrink-0">{formatPrice(item.unitPrice * item.quantity)}</span>
                  </li>
                ))}
              </ul>
              <Separator />
              <p className="text-right text-xl font-bold">合計 {formatPrice(order.totalAmount)}</p>
            </CardContent>
          </Card>
        </div>

        <aside className="w-full min-w-0 lg:max-w-[360px] lg:flex-[1_1_280px] lg:w-auto">
          <Card>
            <CardHeader>
              <CardTitle>
                <h2 className="text-lg font-bold">状態と操作</h2>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <dl>
                <div>
                  <dt className="inline font-medium">状態：</dt>
                  <dd className="inline">
                    <OrderStatusBadge status={order.status} />
                  </dd>
                </div>
              </dl>
              <OrderStatusButtons orderId={order.id} next={nextOwnerStatuses(order.status)} />
            </CardContent>
          </Card>
        </aside>
      </div>

      <div>
        <Button asChild variant="outline">
          <Link href="/dashboard/orders">注文一覧へ戻る</Link>
        </Button>
      </div>
    </div>
  )
}

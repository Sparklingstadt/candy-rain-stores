import type { Metadata } from "next"
import Link from "next/link"
import { deps } from "@/app/dashboard/deps"
import { SiteHeader } from "@/app/components/SiteHeader"
import { formatPrice } from "@/lib/formatPrice"
import { formatOrderDate, ORDER_STATUS_LABELS, orderNumber } from "@/lib/orderStatus"
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
          <p role="status" className="rounded border border-green-300 p-3 text-green-800">
            ご注文を受け付けました。ストアごとに注文が作られています。お支払い方法は各注文の案内をご確認ください
          </p>
        )}
        {orders.length === 0 ? (
          <p>まだ注文がありません</p>
        ) : (
          <ul className="space-y-3">
            {orders.map((order) => (
              <li key={order.id} className="rounded border p-3">
                <Link href={`/orders/${order.id}`} className="font-bold underline">
                  注文番号 {orderNumber(order.id)}
                </Link>
                <p>{order.storeName}</p>
                <p className="text-sm text-gray-600">{formatOrderDate(order.createdAt)}</p>
                <p>
                  {formatPrice(order.totalAmount)}　{ORDER_STATUS_LABELS[order.status]}
                </p>
              </li>
            ))}
          </ul>
        )}
      </main>
    </>
  )
}

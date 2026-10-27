import type { Metadata } from "next"
import Link from "next/link"
import { redirect } from "next/navigation"
import { formatPrice } from "@/lib/formatPrice"
import {
  formatOrderDate,
  ORDER_STATUS_LABELS,
  ORDER_STATUSES,
  orderNumber,
  type OrderStatus,
} from "@/lib/orderStatus"
import { requireSub } from "@/lib/session"
import { listStoreOrders } from "@/services/orderService"
import { deps } from "../deps"

export const metadata: Metadata = { title: "注文管理" }

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string | string[] }>
}) {
  const sub = await requireSub()
  const { status: rawStatus } = await searchParams
  const status = ORDER_STATUSES.find((s) => s === rawStatus) as OrderStatus | undefined
  const orders = await listStoreOrders(deps(), sub, status)
  if (orders === null) redirect("/dashboard")

  const tabs: { label: string; href: string; active: boolean }[] = [
    { label: "すべて", href: "/dashboard/orders", active: !status },
    ...ORDER_STATUSES.map((s) => ({
      label: ORDER_STATUS_LABELS[s],
      href: `/dashboard/orders?status=${s}`,
      active: status === s,
    })),
  ]

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-4">
      <header className="border-b pb-3">
        <h1 className="text-xl font-bold">注文</h1>
      </header>

      <nav aria-label="状態で絞り込む" className="flex flex-wrap gap-2">
        {tabs.map((tab) => (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={tab.active ? "page" : undefined}
            className={`rounded border px-3 py-1 text-sm ${tab.active ? "bg-pink-600 text-white" : ""}`}
          >
            {tab.label}
          </Link>
        ))}
      </nav>

      {orders.length === 0 ? (
        <p className="text-gray-600">注文はまだありません</p>
      ) : (
        <ul className="divide-y rounded border">
          {orders.map((order) => (
            <li key={order.id}>
              <Link href={`/dashboard/orders/${order.id}`} className="block space-y-1 p-3 text-sm">
                <p className="font-medium">注文番号 {orderNumber(order.id)}</p>
                <p>
                  {formatOrderDate(order.createdAt)} ・ {order.buyerName}
                </p>
                <p>
                  {formatPrice(order.totalAmount)} ・ {ORDER_STATUS_LABELS[order.status]}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <Link href="/dashboard" className="text-blue-700 underline">
        ダッシュボードに戻る
      </Link>
    </div>
  )
}

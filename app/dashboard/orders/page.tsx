import type { Metadata } from "next"
import Link from "next/link"
import { redirect } from "next/navigation"
import { OrderStatusBadge } from "@/app/components/OrderStatusBadge"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
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
          <Button key={tab.href} asChild size="sm" variant={tab.active ? "default" : "outline"}>
            <Link href={tab.href} aria-current={tab.active ? "page" : undefined}>
              {tab.label}
            </Link>
          </Button>
        ))}
      </nav>

      {orders.length === 0 ? (
        <p className="text-muted-foreground">注文はまだありません</p>
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>
                  <span className="sr-only">注文番号</span>
                </TableHead>
                <TableHead>注文日時</TableHead>
                <TableHead>購入者</TableHead>
                <TableHead className="text-right">合計</TableHead>
                <TableHead>状態</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.map((order) => (
                <TableRow key={order.id}>
                  <TableCell>
                    <Link
                      href={`/dashboard/orders/${order.id}`}
                      className="font-medium underline underline-offset-4"
                    >
                      注文番号 {orderNumber(order.id)}
                    </Link>
                  </TableCell>
                  <TableCell>{formatOrderDate(order.createdAt)}</TableCell>
                  <TableCell>{order.buyerName}</TableCell>
                  <TableCell className="text-right">{formatPrice(order.totalAmount)}</TableCell>
                  <TableCell>
                    <OrderStatusBadge status={order.status} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Button asChild variant="outline">
        <Link href="/dashboard">ダッシュボードに戻る</Link>
      </Button>
    </div>
  )
}

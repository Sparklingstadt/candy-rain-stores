import type { Metadata } from "next"
import Link from "next/link"
import { redirect } from "next/navigation"
import { ShoppingBagIcon } from "lucide-react"
import { DashboardShell } from "@/app/components/atelier/DashboardShell"
import { OrderStatusBadge } from "@/app/components/OrderStatusBadge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
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
import { countStoreOrdersByStatus, listStoreOrders } from "@/services/orderService"
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
  const [orders, counts] = await Promise.all([
    listStoreOrders(deps(), sub, status),
    countStoreOrdersByStatus(deps(), sub),
  ])
  if (orders === null || counts === null) redirect("/dashboard")

  const tabs: { label: string; href: string; active: boolean }[] = [
    { label: "すべて", href: "/dashboard/orders", active: !status },
    ...ORDER_STATUSES.map((s) => ({
      label: ORDER_STATUS_LABELS[s],
      href: `/dashboard/orders?status=${s}`,
      active: status === s,
    })),
  ]

  return (
    <DashboardShell
      embedded
      title="注文"
      description="お客さんから届いた注文を、ひとつずつ。お支払いの確認や発送に合わせて状態を更新しましょう。"
      active="orders"
    >
      <nav aria-label="状態で絞り込む" className="flex flex-wrap gap-2 rounded-2xl">
        {tabs.map((tab) => (
          <Button key={tab.href} asChild size="sm" variant={tab.active ? "default" : "outline"} className="min-h-10 rounded-full px-4">
            <Link href={tab.href} aria-current={tab.active ? "page" : undefined}>
              {tab.label}
            </Link>
          </Button>
        ))}
      </nav>

      <section aria-label="状態ごとの件数" className="grid grid-cols-[repeat(auto-fit,minmax(140px,1fr))] gap-4">
        {ORDER_STATUSES.map((s) => (
          <Card key={s} className="gap-2 rounded-2xl p-5 shadow-none">
            <span className="text-muted-foreground text-xs">{ORDER_STATUS_LABELS[s]}</span>
            <span className="text-3xl font-medium tabular-nums">{counts[s]}</span>
          </Card>
        ))}
      </section>

      {orders.length === 0 ? (
        <div className="bg-card flex flex-col items-center rounded-3xl border border-dashed px-6 py-16 text-center">
          <span className="bg-secondary text-primary mb-5 grid size-16 place-items-center rounded-3xl"><ShoppingBagIcon aria-hidden="true" className="size-7" /></span>
          <p className="font-medium">注文はまだありません</p>
          <p className="text-muted-foreground mt-2 max-w-sm text-sm leading-7">{status ? "この状態の注文が届くと、ここに表示されます。" : "お客さんから届いた注文を、ここで確認できます。"}</p>
        </div>
      ) : (
        <div className="bg-card overflow-hidden rounded-3xl border">
          <Table>
            <TableHeader className="bg-secondary/25">
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
                <TableRow key={order.id} className="hover:bg-secondary/20">
                  <TableCell className="py-5">
                    <Link
                      href={`/dashboard/orders/${order.id}`}
                      className="text-primary font-medium underline decoration-primary/30 underline-offset-4 hover:decoration-primary"
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

      <Button asChild variant="ghost" className="text-muted-foreground rounded-full">
        <Link href="/dashboard">ダッシュボードに戻る</Link>
      </Button>
    </DashboardShell>
  )
}

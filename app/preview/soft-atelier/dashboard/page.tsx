import type { Metadata } from "next"
import Link from "next/link"
import { ArrowRightIcon, ArrowUpRightIcon, ImagesIcon, PackageIcon, ShoppingBagIcon } from "lucide-react"
import { DashboardShell } from "@/app/components/atelier/DashboardShell"
import { OrderStatusBadge } from "@/app/components/OrderStatusBadge"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { formatPrice } from "@/lib/formatPrice"
import type { OrderStatus } from "@/lib/orderStatus"
import { sampleProducts, sampleStore } from "../data"

export const metadata: Metadata = { title: "店主の管理画面の見本 | Soft Atelier" }

const dashboardHref = "/preview/soft-atelier/dashboard"
const storeHref = "/preview/soft-atelier"
const sampleOrders: { id: string; date: string; productIndex: number; quantity: number; status: OrderStatus }[] = [
  { id: "DEMO-0105", date: "10月28日 10:30", productIndex: 0, quantity: 2, status: "RECEIVED" },
  { id: "DEMO-0104", date: "10月28日 09:12", productIndex: 2, quantity: 1, status: "RECEIVED" },
  { id: "DEMO-0103", date: "10月27日 18:45", productIndex: 1, quantity: 1, status: "RECEIVED" },
  { id: "DEMO-0102", date: "10月27日 14:20", productIndex: 4, quantity: 1, status: "PAID" },
  { id: "DEMO-0101", date: "10月26日 11:08", productIndex: 3, quantity: 1, status: "SHIPPED" },
]

function SampleOrderTable() {
  return (
    <div className="overflow-hidden rounded-2xl border">
      <Table>
        <TableHeader className="bg-secondary/25">
          <TableRow>
            <TableHead className="pl-5">注文番号</TableHead>
            <TableHead>注文日時</TableHead>
            <TableHead>商品</TableHead>
            <TableHead className="text-right">合計</TableHead>
            <TableHead className="pr-5">状態</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sampleOrders.map((order) => {
            const product = sampleProducts[order.productIndex]
            return (
              <TableRow key={order.id} className="hover:bg-secondary/20">
                <TableCell className="py-5 pl-5 text-xs font-medium">{order.id}</TableCell>
                <TableCell className="text-muted-foreground text-xs">{order.date}</TableCell>
                <TableCell className="min-w-36 whitespace-normal">
                  <span className="block text-sm">{product.name}</span>
                  <span className="text-muted-foreground mt-1 block text-xs">{order.quantity} 点</span>
                </TableCell>
                <TableCell className="text-right text-sm">{formatPrice(product.price * order.quantity)}</TableCell>
                <TableCell className="pr-5"><OrderStatusBadge status={order.status} /></TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}

function SampleProductsTable() {
  return (
    <div className="bg-card overflow-hidden rounded-3xl border">
      <Table>
        <TableHeader className="bg-secondary/25">
          <TableRow>
            <TableHead className="w-24 pl-5"><span className="sr-only">商品画像</span></TableHead>
            <TableHead>商品名</TableHead>
            <TableHead className="text-right">価格</TableHead>
            <TableHead className="text-right">在庫</TableHead>
            <TableHead>状態</TableHead>
            <TableHead className="pr-5"><span className="sr-only">商品を見る</span></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sampleProducts.map((product) => (
            <TableRow key={product.id} className="hover:bg-secondary/20">
              <TableCell className="py-4 pl-5">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={product.images[0].url} alt="" className="size-16 rounded-xl object-cover" />
              </TableCell>
              <TableCell className="min-w-40 whitespace-normal">
                <Link href={product.href} className="text-primary rounded-sm text-sm font-medium underline decoration-primary/30 underline-offset-4 hover:decoration-primary">{product.name}</Link>
                <span className="text-muted-foreground mt-1.5 block text-xs">商品画像 {product.images.length} 枚</span>
              </TableCell>
              <TableCell className="text-right">{formatPrice(product.price)}</TableCell>
              <TableCell className="text-right">{product.stock}</TableCell>
              <TableCell><Badge variant={product.isPublished ? "default" : "secondary"}>{product.isPublished ? "公開中" : "非公開"}</Badge></TableCell>
              <TableCell className="pr-5"><Button asChild size="sm" variant="outline" className="rounded-full"><Link href={product.href}>商品を見る<ArrowUpRightIcon aria-hidden="true" className="size-3.5" /></Link></Button></TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

function StoreSettingsExample() {
  return (
    <section id="store-settings" className="scroll-mt-8">
      <Card className="rounded-3xl shadow-none">
        <CardHeader className="border-b pb-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle><h2 className="text-lg font-semibold">ストア設定の見本</h2></CardTitle>
            <Badge variant="outline">読み取り専用</Badge>
          </div>
          <p className="text-muted-foreground mt-2 text-sm leading-7">紹介文や写真で、お店の空気を伝えましょう。ここでは設定内容の例を表示しています。</p>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-x-8 gap-y-6 text-sm sm:grid-cols-2">
            <div><dt className="text-muted-foreground mb-2 text-xs">ストア名</dt><dd className="font-medium">{sampleStore.name}</dd></div>
            <div><dt className="text-muted-foreground mb-2 text-xs">テーマカラー</dt><dd className="flex items-center gap-2"><span aria-hidden="true" className="bg-primary size-4 rounded-full" />やさしいローズ</dd></div>
            <div className="sm:col-span-2"><dt className="text-muted-foreground mb-2 text-xs">説明文</dt><dd className="leading-7 whitespace-pre-line">{sampleStore.description}</dd></div>
            <div className="sm:col-span-2"><dt className="text-muted-foreground mb-2 text-xs">お支払い方法の案内</dt><dd className="leading-7">ご注文後に、ストアからお支払い方法をご案内します。</dd></div>
          </dl>
        </CardContent>
      </Card>
    </section>
  )
}

export default async function DashboardPreviewPage({ searchParams }: { searchParams: Promise<{ view?: string }> }) {
  const { view } = await searchParams
  const active = view === "products" || view === "orders" ? view : "home"
  const receivedCount = sampleOrders.filter((order) => order.status === "RECEIVED").length
  const imageCount = sampleProducts.reduce((sum, product) => sum + product.images.length, 0)
  const title = active === "products" ? "商品" : active === "orders" ? "注文" : "今日のお店"
  const description = active === "products"
    ? "写真や説明に、あなたのお店らしさを。5つの木製品を並べた商品管理の見本です。"
    : active === "orders"
      ? "届いた注文を、ひとつずつ。受付から支払い確認、発送までの状態を見渡せます。"
      : "届いた注文を確認して、今日もあなたのペースで。"

  return (
    <DashboardShell
      title={title}
      description={description}
      storeName={sampleStore.name}
      storeHref={storeHref}
      active={active}
      navigationLinks={{ home: dashboardHref, products: `${dashboardHref}?view=products`, orders: `${dashboardHref}?view=orders`, settings: `${dashboardHref}#store-settings` }}
      accountAction={<Badge variant="outline" className="rounded-full px-3 py-1.5">店主の画面見本</Badge>}
      headerAction={<Button asChild variant="outline" className="min-h-11 rounded-full"><Link href={storeHref}>ストアページを見る<ArrowUpRightIcon aria-hidden="true" className="size-4" /></Link></Button>}
    >
      {active === "home" && (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            {[
              { label: "受付中の注文", value: receivedCount, unit: "件", icon: ShoppingBagIcon, href: `${dashboardHref}?view=orders` },
              { label: "公開中の商品", value: sampleProducts.filter((product) => product.isPublished).length, unit: "点", icon: PackageIcon, href: `${dashboardHref}?view=products` },
              { label: "登録した商品画像", value: imageCount, unit: "枚", icon: ImagesIcon, href: `${dashboardHref}?view=products` },
            ].map(({ label, value, unit, icon: Icon, href }, index) => (
              <Link key={label} href={href} className={`focus-visible:ring-ring group rounded-3xl border p-6 outline-none transition-colors focus-visible:ring-2 ${index === 0 ? "bg-secondary/55 border-transparent hover:bg-secondary/75" : "bg-card hover:border-primary/30"}`}>
                <span className="text-muted-foreground flex items-center gap-2 text-xs"><Icon aria-hidden="true" className="size-4" />{label}</span>
                <span className="mt-5 block text-4xl font-medium tracking-tight">{value}<span className="text-muted-foreground ml-2 text-xs font-normal">{unit}</span></span>
                <span className="text-muted-foreground mt-4 flex items-center justify-between text-[10px]">サンプルデータ<ArrowRightIcon aria-hidden="true" className="group-hover:text-primary size-3.5" /></span>
              </Link>
            ))}
          </div>
          <Card className="rounded-3xl shadow-none">
            <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
              <CardTitle><h2 className="text-lg font-semibold">最近の注文</h2></CardTitle>
              <Link href={`${dashboardHref}?view=orders`} className="text-primary inline-flex min-h-10 items-center gap-2 text-xs font-medium">すべて見る<ArrowRightIcon aria-hidden="true" className="size-3.5" /></Link>
            </CardHeader>
            <CardContent><SampleOrderTable /></CardContent>
          </Card>
          <StoreSettingsExample />
        </>
      )}
      {active === "products" && (
        <>
          <div className="flex items-center justify-between gap-3"><h2 className="text-sm font-medium">登録している商品</h2><span className="text-muted-foreground text-xs">{sampleProducts.length} 商品 / {imageCount} 枚の画像</span></div>
          <SampleProductsTable />
          <p className="text-muted-foreground text-xs leading-7">商品名や「商品を見る」から、公開ストア側の商品詳細を確認できます。この見本では商品の追加や編集は行えません。</p>
        </>
      )}
      {active === "orders" && (
        <Card className="rounded-3xl shadow-none">
          <CardHeader><CardTitle><h2 className="text-lg font-semibold">注文一覧</h2></CardTitle><p className="text-muted-foreground mt-2 text-sm leading-7">受付・支払確認・発送済みの表示例です。状態の変更は行えません。</p></CardHeader>
          <CardContent><SampleOrderTable /></CardContent>
        </Card>
      )}
    </DashboardShell>
  )
}

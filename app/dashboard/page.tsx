import Link from "next/link"
import { ArrowRightIcon, PackageIcon, ShoppingBagIcon, StoreIcon } from "lucide-react"
import { DashboardShell } from "@/app/components/atelier/DashboardShell"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { requireSub } from "@/lib/session"
import { countReceivedOrders } from "@/services/orderService"
import { getOwnStore } from "@/services/storeService"
import { setPublishedAction } from "./actions"
import { deps } from "./deps"
import { DeleteStoreForm } from "./DeleteStoreForm"
import { StoreForm } from "./StoreForm"

export default async function DashboardPage() {
  const sub = await requireSub()
  const store = await getOwnStore(deps(), sub)
  const receivedCount = store ? await countReceivedOrders(deps(), sub) : 0

  return (
    <DashboardShell
      embedded
      title={store ? "今日のお店" : "お店をはじめましょう"}
      description={store ? "届いた注文を確認して、今日もあなたのペースで。" : "好きなものを届ける、あなただけの小さなお店をつくりましょう。"}
      storeName={store?.name}
      storeHref={store ? `/s/${store.slug}` : undefined}
      active="home"
    >
      {store === null ? (
        <section id="store-settings" className="max-w-3xl scroll-mt-8">
          <StoreForm />
        </section>
      ) : (
        <>
          <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(230px,0.7fr)]">
            <Card className="rounded-3xl shadow-none">
              <CardHeader>
                <div className="mb-3 flex items-center justify-between gap-3">
                  <span className="bg-secondary/60 text-primary grid size-12 place-items-center overflow-hidden rounded-2xl">
                    {store.logoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={store.logoUrl} alt="" className="size-full object-cover" />
                    ) : <StoreIcon aria-hidden="true" className="size-5" />}
                  </span>
                  <Badge variant={store.isPublished ? "default" : "secondary"}>
                    {store.isPublished ? "公開中" : "非公開"}
                  </Badge>
                </div>
                <CardTitle><h2 className="text-xl leading-snug font-semibold break-words">{store.name}</h2></CardTitle>
                <p className="text-muted-foreground mt-2 flex items-center gap-2 text-xs">
                  <span aria-hidden="true" className="size-2.5 shrink-0 rounded-full border" style={{ backgroundColor: store.themeColor }} />
                  /s/{store.slug}
                </p>
              </CardHeader>
              <CardContent className="flex flex-wrap items-center gap-2">
                <Button asChild variant="outline" className="rounded-full">
                  <Link href={`/s/${store.slug}`}>ストアをプレビュー</Link>
                </Button>
                <form action={setPublishedAction}>
                  <input type="hidden" name="publish" value={store.isPublished ? "false" : "true"} />
                  <Button type="submit" variant="ghost" className="rounded-full">
                    {store.isPublished ? "非公開にする" : "公開する"}
                  </Button>
                </form>
              </CardContent>
            </Card>

            <Card className="bg-secondary/55 rounded-3xl border-transparent shadow-none">
              <CardHeader>
                <div className="text-primary flex items-center gap-2 text-sm font-medium"><ShoppingBagIcon aria-hidden="true" className="size-4" />受付中の注文</div>
                <p className="mt-4 text-5xl font-medium tracking-tight">{receivedCount}<span className="text-muted-foreground ml-2 text-sm font-normal">件</span></p>
              </CardHeader>
              <CardContent className="mt-auto">
                <p className="text-muted-foreground mb-4 text-xs leading-6">{receivedCount > 0 ? "お客さんから注文が届いています。内容を確認しましょう。" : "いま受付中の注文はありません。お店を整えながら、次の出会いを待ちましょう。"}</p>
                <Button asChild className="h-auto min-h-10 w-full rounded-full py-2 whitespace-normal">
                  <Link href="/dashboard/orders">受付中の注文を確認（{receivedCount} 件）<ArrowRightIcon aria-hidden="true" className="size-4" /></Link>
                </Button>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Link href="/dashboard/products" aria-label="商品の写真や在庫を整える" className="bg-card hover:border-primary/30 focus-visible:ring-ring group flex min-h-24 items-center gap-4 rounded-2xl border p-5 outline-none transition-colors focus-visible:ring-2">
              <span className="bg-secondary/50 text-primary grid size-11 shrink-0 place-items-center rounded-xl"><PackageIcon aria-hidden="true" className="size-5" /></span>
              <span className="min-w-0"><span className="block text-sm font-semibold">商品を管理</span><span className="text-muted-foreground mt-1 block text-xs leading-5">商品・写真・在庫を整える</span></span>
              <ArrowRightIcon aria-hidden="true" className="text-muted-foreground group-hover:text-primary ml-auto size-4 shrink-0" />
            </Link>
            <Link href="#store-settings" className="bg-card hover:border-primary/30 focus-visible:ring-ring group flex min-h-24 items-center gap-4 rounded-2xl border p-5 outline-none transition-colors focus-visible:ring-2">
              <span className="bg-secondary/50 text-primary grid size-11 shrink-0 place-items-center rounded-xl"><StoreIcon aria-hidden="true" className="size-5" /></span>
              <span className="min-w-0"><span className="block text-sm font-semibold">ストア設定</span><span className="text-muted-foreground mt-1 block text-xs leading-5">お店の紹介や支払い方法を編集</span></span>
              <ArrowRightIcon aria-hidden="true" className="text-muted-foreground group-hover:text-primary ml-auto size-4 shrink-0" />
            </Link>
          </div>

          <section id="store-settings" className="scroll-mt-8 pt-4">
            <StoreForm
              store={{
                slug: store.slug,
                name: store.name,
                description: store.description,
                themeColor: store.themeColor,
                paymentInstructions: store.paymentInstructions,
                logoUrl: store.logoUrl,
                headerUrl: store.headerUrl,
              }}
            />
          </section>
          <div className="border-t pt-7"><DeleteStoreForm slug={store.slug} /></div>
        </>
      )}
    </DashboardShell>
  )
}

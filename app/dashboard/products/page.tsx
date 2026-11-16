import Link from "next/link"
import { redirect } from "next/navigation"
import { PackageIcon, PlusIcon } from "lucide-react"
import { DashboardShell } from "@/app/components/atelier/DashboardShell"
import { Badge } from "@/components/ui/badge"
import { Button, buttonVariants } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { cn } from "@/lib/utils"
import { formatPrice } from "@/lib/formatPrice"
import { MAX_PRODUCTS_PER_STORE } from "@/lib/productValidation"
import { requireSub } from "@/lib/session"
import { listOwnProducts } from "@/services/productService"
import { getOwnStore } from "@/services/storeService"
import { deps } from "../deps"

export default async function ProductsPage() {
  const sub = await requireSub()
  const store = await getOwnStore(deps(), sub)
  if (!store) redirect("/dashboard")
  const products = (await listOwnProducts(deps(), sub)) ?? []
  const full = products.length >= MAX_PRODUCTS_PER_STORE

  return (
    <DashboardShell
      embedded
      title="商品"
      description="写真や説明に、あなたのお店らしさを。価格・在庫・公開状態をここで管理できます。"
      storeName={store.name}
      storeHref={`/s/${store.slug}`}
      active="products"
      headerAction={full ? (
        <div className="text-right">
          <span aria-disabled="true" className={cn(buttonVariants(), "cursor-not-allowed opacity-50")}>
            商品を追加
          </span>
          <p className="text-muted-foreground mt-1 text-sm">商品は {MAX_PRODUCTS_PER_STORE} 件までです</p>
        </div>
      ) : (
        <Button asChild className="min-h-11 rounded-full px-5">
          <Link href="/dashboard/products/new"><PlusIcon aria-hidden="true" className="size-4" />商品を追加</Link>
        </Button>
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium">登録している商品</p>
        <p className="text-muted-foreground text-xs">{products.length} / {MAX_PRODUCTS_PER_STORE} 件</p>
      </div>

      {products.length === 0 ? (
        <div className="bg-card flex flex-col items-center rounded-3xl border border-dashed px-6 py-16 text-center">
          <span className="bg-secondary text-primary mb-5 grid size-16 place-items-center rounded-3xl"><PackageIcon aria-hidden="true" className="size-7" /></span>
          <p className="font-medium">まだ商品がありません</p>
          <p className="text-muted-foreground mt-2 max-w-sm text-sm leading-7">「商品を追加」から、最初の商品を登録しましょう。写真や説明はあとから編集できます。</p>
        </div>
      ) : (
        <div className="bg-card overflow-hidden rounded-3xl border">
          <Table>
            <TableHeader className="bg-secondary/25">
              <TableRow>
                <TableHead className="w-20">
                  <span className="sr-only">画像</span>
                </TableHead>
                <TableHead>商品名</TableHead>
                <TableHead className="text-right">価格</TableHead>
                <TableHead className="text-right">在庫</TableHead>
                <TableHead>状態</TableHead>
                <TableHead>
                  <span className="sr-only">操作</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.map((product) => (
                <TableRow key={product.id} className="hover:bg-secondary/20">
                  <TableCell>
                    {product.images[0] ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={product.images[0].url} alt="" className="my-1 size-14 rounded-xl object-cover" />
                    ) : (
                      <div className="bg-secondary/40 my-1 grid size-14 place-items-center rounded-xl" aria-hidden="true"><PackageIcon className="text-muted-foreground size-5" /></div>
                    )}
                  </TableCell>
                  <TableCell className="min-w-40 font-medium whitespace-normal break-words">{product.name}</TableCell>
                  <TableCell className="text-right">{formatPrice(product.price)}</TableCell>
                  <TableCell className="text-right">{product.stock}</TableCell>
                  <TableCell>
                    <Badge variant={product.isPublished ? "default" : "secondary"}>
                      {product.isPublished ? "公開中" : "非公開"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Button asChild size="sm" variant="outline" className="rounded-full">
                      <Link href={`/dashboard/products/${product.id}`}>編集</Link>
                    </Button>
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

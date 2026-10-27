import Link from "next/link"
import { redirect } from "next/navigation"
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
    <div className="mx-auto max-w-2xl space-y-6 p-4">
      <header className="flex items-center justify-between gap-3 border-b pb-3">
        <h1 className="text-xl font-bold">商品</h1>
        {full ? (
          <div className="text-right">
            <span aria-disabled="true" className={cn(buttonVariants(), "cursor-not-allowed opacity-50")}>
              商品を追加
            </span>
            <p className="text-muted-foreground mt-1 text-sm">商品は {MAX_PRODUCTS_PER_STORE} 件までです</p>
          </div>
        ) : (
          <Button asChild>
            <Link href="/dashboard/products/new">商品を追加</Link>
          </Button>
        )}
      </header>

      {products.length === 0 ? (
        <p className="text-muted-foreground">まだ商品がありません</p>
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
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
                <TableRow key={product.id}>
                  <TableCell>
                    {product.images[0] ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={product.images[0].url} alt="" className="h-12 w-12 rounded-md object-cover" />
                    ) : (
                      <div className="bg-muted h-12 w-12 rounded-md" aria-hidden="true" />
                    )}
                  </TableCell>
                  <TableCell className="font-medium">{product.name}</TableCell>
                  <TableCell className="text-right">{formatPrice(product.price)}</TableCell>
                  <TableCell className="text-right">{product.stock}</TableCell>
                  <TableCell>
                    <Badge variant={product.isPublished ? "default" : "secondary"}>
                      {product.isPublished ? "公開中" : "非公開"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Button asChild size="sm" variant="outline">
                      <Link href={`/dashboard/products/${product.id}`}>編集</Link>
                    </Button>
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

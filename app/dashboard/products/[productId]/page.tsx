import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { requireSub } from "@/lib/session"
import { getOwnProduct, isUuid } from "@/services/productService"
import { getOwnStore } from "@/services/storeService"
import { deps } from "../../deps"
import { setProductPublishedAction } from "../actions"
import { DeleteProductForm } from "../DeleteProductForm"
import { ProductForm } from "../ProductForm"
import { ProductImages } from "../ProductImages"

export default async function EditProductPage({ params }: { params: Promise<{ productId: string }> }) {
  const { productId } = await params
  const sub = await requireSub()
  const store = await getOwnStore(deps(), sub)
  if (!store) redirect("/dashboard")
  if (!isUuid(productId)) notFound()
  const product = await getOwnProduct(deps(), sub, productId)
  if (!product) notFound()

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-4">
      <Card>
        <CardHeader>
          <CardTitle>
            <h1 className="text-xl font-bold">{product.name}</h1>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Badge variant={product.isPublished ? "default" : "secondary"}>
            {product.isPublished ? "公開中" : "非公開"}
          </Badge>
          <div className="flex flex-wrap items-center gap-3">
            <form action={setProductPublishedAction.bind(null, product.id)}>
              <input type="hidden" name="publish" value={product.isPublished ? "false" : "true"} />
              <Button type="submit" variant="outline">
                {product.isPublished ? "非公開にする" : "公開する"}
              </Button>
            </form>
            <Button asChild variant="outline">
              <Link href={`/s/${store.slug}/products/${product.id}`}>商品ページを見る</Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      <ProductForm
        product={{
          id: product.id,
          name: product.name,
          description: product.description,
          price: product.price,
          stock: product.stock,
        }}
      />
      <ProductImages productId={product.id} images={product.images} />
      <DeleteProductForm productId={product.id} />

      <Button asChild variant="outline">
        <Link href="/dashboard/products">商品一覧に戻る</Link>
      </Button>
    </div>
  )
}

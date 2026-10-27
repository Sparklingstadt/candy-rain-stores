import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { formatPrice } from "@/lib/formatPrice"
import type { ProductView } from "@/services/productService"

export function ProductGrid({
  slug,
  products,
  filtered,
}: {
  slug: string
  products: ProductView[]
  // true when a tab filter is active, so an empty list reads as "no match"
  filtered: boolean
}) {
  if (products.length === 0) {
    return (
      <p className="text-muted-foreground py-8 text-center">
        {filtered ? "該当する商品はありません" : "商品はまだありません"}
      </p>
    )
  }
  return (
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-[repeat(auto-fill,minmax(220px,1fr))] sm:gap-5">
      {products.map((product) => {
        const image = product.images[0]
        return (
          <li key={product.id} className="min-w-0">
            <Link
              href={`/s/${slug}/products/${product.id}`}
              className="focus-visible:ring-ring/50 block h-full rounded-xl outline-none focus-visible:ring-[3px]"
            >
              <Card className="hover:bg-accent/50 h-full gap-0 overflow-hidden py-0 transition-colors">
                <div className="bg-muted relative aspect-square overflow-hidden">
                  {image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={image.url} alt="" className="h-full w-full object-cover" />
                  ) : null}
                  <div className="absolute top-2 right-2 flex flex-col items-end gap-1">
                    {!product.isPublished && <Badge variant="secondary">非公開</Badge>}
                    {product.stock === 0 && <Badge variant="destructive">売り切れ</Badge>}
                  </div>
                </div>
                <CardContent className="space-y-1 p-3.5">
                  <p className="font-semibold wrap-anywhere">{product.name}</p>
                  <p className="text-muted-foreground">{formatPrice(product.price)}</p>
                </CardContent>
              </Card>
            </Link>
          </li>
        )
      })}
    </ul>
  )
}

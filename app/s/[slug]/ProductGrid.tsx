import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { formatPrice } from "@/lib/formatPrice"
import type { ProductView } from "@/services/productService"

export function ProductGrid({ slug, products }: { slug: string; products: ProductView[] }) {
  if (products.length === 0) return <p className="text-muted-foreground">商品はまだありません</p>
  return (
    <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3">
      {products.map((product) => {
        const image = product.images[0]
        return (
          <li key={product.id}>
            <Link
              href={`/s/${slug}/products/${product.id}`}
              className="focus-visible:ring-ring/50 block rounded-xl outline-none focus-visible:ring-[3px]"
            >
              <Card className="hover:bg-accent/50 gap-0 overflow-hidden py-0 transition-colors">
                <div className="bg-muted relative aspect-square overflow-hidden border-b-2 border-(--store-color)">
                  {image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={image.url} alt="" className="h-full w-full object-cover" />
                  ) : null}
                  <div className="absolute top-1.5 left-1.5 flex flex-col items-start gap-1">
                    {!product.isPublished && <Badge variant="secondary">非公開</Badge>}
                    {product.stock === 0 && <Badge variant="destructive">売り切れ</Badge>}
                  </div>
                </div>
                <CardContent className="space-y-1 p-3">
                  <p className="font-medium">{product.name}</p>
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

import Link from "next/link"
import { formatPrice } from "@/lib/formatPrice"
import type { ProductView } from "@/services/productService"

export function ProductGrid({ slug, products }: { slug: string; products: ProductView[] }) {
  if (products.length === 0) return <p className="text-gray-600">商品はまだありません</p>
  return (
    <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3">
      {products.map((product) => {
        const image = product.images[0]
        return (
          <li key={product.id}>
            <Link href={`/s/${slug}/products/${product.id}`} className="block space-y-2">
              <div className="relative aspect-square overflow-hidden rounded border-2 border-(--store-color)">
                {image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={image.url} alt="" className="h-full w-full object-cover" />
                ) : null}
                <div className="absolute left-1 top-1 flex flex-col items-start gap-1 text-xs">
                  {!product.isPublished && (
                    <span className="rounded bg-gray-800 px-2 py-0.5 text-white">非公開</span>
                  )}
                  {product.stock === 0 && (
                    <span className="rounded bg-red-700 px-2 py-0.5 text-white">売り切れ</span>
                  )}
                </div>
              </div>
              <p className="font-medium">{product.name}</p>
              <p className="text-gray-700">{formatPrice(product.price)}</p>
            </Link>
          </li>
        )
      })}
    </ul>
  )
}

import Link from "next/link"
import { redirect } from "next/navigation"
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
      <header className="flex items-center justify-between border-b pb-3">
        <h1 className="text-xl font-bold">商品</h1>
        {full ? (
          <div className="text-right">
            <span aria-disabled="true" className="rounded bg-gray-300 px-4 py-2 text-gray-600">
              商品を追加
            </span>
            <p className="mt-1 text-sm text-gray-600">商品は {MAX_PRODUCTS_PER_STORE} 件までです</p>
          </div>
        ) : (
          <Link href="/dashboard/products/new" className="rounded bg-pink-600 px-4 py-2 text-white">
            商品を追加
          </Link>
        )}
      </header>

      {products.length === 0 ? (
        <p className="text-gray-600">まだ商品がありません</p>
      ) : (
        <ul className="divide-y rounded border">
          {products.map((product) => (
            <li key={product.id} className="flex items-center gap-3 p-3">
              {product.images[0] ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={product.images[0].url} alt="" className="h-16 w-16 rounded object-cover" />
              ) : (
                <div className="h-16 w-16 rounded bg-gray-200" aria-hidden="true" />
              )}
              <div className="min-w-0 flex-1 text-sm">
                <p className="truncate font-medium">{product.name}</p>
                <p>
                  {formatPrice(product.price)} ・ 在庫 {product.stock} ・{" "}
                  {product.isPublished ? "公開中" : "非公開"}
                </p>
              </div>
              <Link href={`/dashboard/products/${product.id}`} className="text-blue-700 underline">
                編集
              </Link>
            </li>
          ))}
        </ul>
      )}

      <Link href="/dashboard" className="text-blue-700 underline">
        ダッシュボードに戻る
      </Link>
    </div>
  )
}

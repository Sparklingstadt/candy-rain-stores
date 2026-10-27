import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { cache } from "react"
import { deps } from "@/app/dashboard/deps"
import { SiteHeader } from "@/app/components/SiteHeader"
import { formatPrice } from "@/lib/formatPrice"
import { getSub } from "@/lib/session"
import { normalizeSlug } from "@/lib/storeValidation"
import { getProductForViewer } from "@/services/productService"
import { AddToCartForm } from "./AddToCartForm"
import { ProductGallery } from "./ProductGallery"

type Props = { params: Promise<{ slug: string; productId: string }> }

const load = cache(async (params: Props["params"]) => {
  const { slug, productId } = await params
  return getProductForViewer(deps(), normalizeSlug(slug), productId, await getSub())
})

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const found = await load(params)
  return found ? { title: `${found.product.name} | ${found.store.name}` } : {}
}

export default async function ProductPage({ params }: Props) {
  const found = await load(params)
  if (!found) notFound()
  const { store, product, isOwnerPreview } = found
  const viewerSub = await getSub()
  const path = `/s/${store.slug}/products/${product.id}`

  return (
    <div style={{ "--store-color": store.themeColor } as React.CSSProperties}>
      <SiteHeader path={path} />
      {isOwnerPreview && (
        <div className="bg-gray-800 px-4 py-2 text-sm text-white">
          非公開です（あなたにだけ表示されています）
        </div>
      )}
      <main className="mx-auto max-w-2xl space-y-4 p-4">
        <ProductGallery name={product.name} images={product.images} />
        <h1 className="text-2xl font-bold">{product.name}</h1>
        <p className="text-xl">{formatPrice(product.price)}</p>
        <p>{product.stock > 0 ? `在庫 ${product.stock} 点` : "売り切れ"}</p>
        {!isOwnerPreview && (
          <AddToCartForm
            productId={product.id}
            path={path}
            signedIn={viewerSub !== null}
            stock={product.stock}
            isOwnStore={viewerSub !== null && viewerSub === store.ownerSub}
          />
        )}
        {product.description && <p className="whitespace-pre-line">{product.description}</p>}
        <Link href={`/s/${store.slug}`} className="inline-block text-blue-700 underline">
          ストアに戻る
        </Link>
      </main>
    </div>
  )
}

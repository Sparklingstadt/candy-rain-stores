import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { cache } from "react"
import { EyeOffIcon } from "lucide-react"
import { deps } from "@/app/dashboard/deps"
import { SiteHeader } from "@/app/components/SiteHeader"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { formatPrice } from "@/lib/formatPrice"
import { readableTextColor } from "@/lib/color"
import { getSub } from "@/lib/session"
import { normalizeSlug } from "@/lib/storeValidation"
import { getProductForViewer, listOtherProducts } from "@/services/productService"
import { AddToCartForm } from "./AddToCartForm"
import { ProductGrid } from "../../ProductGrid"
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

const OTHER_PRODUCTS_LIMIT = 6

export default async function ProductPage({ params }: Props) {
  const found = await load(params)
  if (!found) notFound()
  const { store, product, isOwnerPreview } = found
  const viewerSub = await getSub()
  const path = `/s/${store.slug}/products/${product.id}`
  const others = await listOtherProducts(deps(), store.id, product.id, OTHER_PRODUCTS_LIMIT)
  const onAccent = readableTextColor(store.themeColor)

  return (
    <div style={{ "--store-color": store.themeColor } as React.CSSProperties}>
      <SiteHeader path={path} />
      {isOwnerPreview && (
        <Alert role="status" className="rounded-none border-x-0 border-t-0">
          <EyeOffIcon />
          <AlertDescription className="text-foreground">
            非公開です（あなたにだけ表示されています）
          </AlertDescription>
        </Alert>
      )}
      <main className="mx-auto flex max-w-[1440px] flex-col gap-6 px-4 pt-6 pb-16 sm:px-8">
        <nav aria-label="パンくず" className="text-muted-foreground flex min-w-0 gap-2 text-[13px]">
          <Link href={`/s/${store.slug}`} className="hover:text-foreground max-w-[50%] truncate underline-offset-4 hover:underline">
            {store.name}
          </Link>
          <span aria-hidden="true">/</span>
          <span aria-current="page" className="min-w-0 truncate">
            {product.name}
          </span>
        </nav>

        <div className="flex flex-wrap items-start gap-x-10 gap-y-6">
          <section className="min-w-0 flex-[999_1_100%] md:flex-[999_1_560px]">
            <ProductGallery name={product.name} images={product.images} />
          </section>

          <aside className="flex w-full min-w-0 flex-col gap-4 md:w-auto md:max-w-[440px] md:flex-[1_1_360px]">
            <Card className="gap-[18px] rounded-[18px] p-5 sm:p-7">
              <div className="flex flex-col gap-2">
                <h1 className="text-2xl leading-snug font-bold wrap-anywhere">{product.name}</h1>
                <span className="text-[28px] leading-tight font-bold">{formatPrice(product.price)}</span>
                {product.stock > 0 ? (
                  <span className="text-muted-foreground text-[13px]">{`在庫 ${product.stock} 点`}</span>
                ) : (
                  <div>
                    <Badge variant="destructive">売り切れ</Badge>
                  </div>
                )}
              </div>
              {!isOwnerPreview && (
                <AddToCartForm
                  productId={product.id}
                  path={path}
                  signedIn={viewerSub !== null}
                  stock={product.stock}
                  isOwnStore={viewerSub !== null && viewerSub === store.ownerSub}
                  onAccent={onAccent}
                />
              )}
              <hr />
              <Link
                href={`/s/${store.slug}`}
                className="focus-visible:ring-ring/50 -m-1 flex items-center gap-3 rounded-lg p-1 outline-none focus-visible:ring-[3px]"
              >
                {store.logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={store.logoUrl} alt="" className="size-11 shrink-0 rounded-xl object-cover" />
                ) : (
                  <span
                    aria-hidden="true"
                    className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-(--store-color) font-bold"
                    style={{ color: onAccent }}
                  >
                    {Array.from(store.name)[0]}
                  </span>
                )}
                <span className="flex min-w-0 flex-col gap-0.5">
                  <span className="text-sm font-semibold wrap-anywhere">{store.name}</span>
                  <span className="text-muted-foreground text-xs">ストアに戻る</span>
                </span>
              </Link>
            </Card>
            {product.description && (
              <Card className="gap-2.5 rounded-[18px] p-5 sm:p-6">
                <h2 className="text-[15px] font-semibold">商品の説明</h2>
                <p className="text-card-foreground/80 text-sm leading-[1.8] wrap-anywhere whitespace-pre-line">
                  {product.description}
                </p>
              </Card>
            )}
          </aside>
        </div>

        {others.length > 0 && (
          <section className="mt-4 flex flex-col gap-4">
            <h2 className="text-lg font-semibold">このストアのほかの商品</h2>
            <ProductGrid slug={store.slug} products={others} filtered={false} />
          </section>
        )}
      </main>
    </div>
  )
}

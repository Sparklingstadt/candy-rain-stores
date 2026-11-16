import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { cache } from "react"
import { ArrowLeftIcon, ArrowUpRightIcon, ChevronRightIcon, EyeOffIcon, WalletIcon } from "lucide-react"
import { deps } from "@/app/dashboard/deps"
import { SiteHeader } from "@/app/components/SiteHeader"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { formatPrice } from "@/lib/formatPrice"
import { readableTextColor } from "@/lib/color"
import { getSub } from "@/lib/session"
import { normalizeSlug } from "@/lib/storeValidation"
import { getProductForViewer, listOtherProducts } from "@/services/productService"
import { AddToCartForm } from "./AddToCartForm"
import { ProductGallery } from "./ProductGallery"
import { ProductGrid } from "../../ProductGrid"

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
    <div className="min-h-screen bg-[#fffaf6] text-[#4b3439]" style={{ "--store-color": store.themeColor } as React.CSSProperties}>
      <SiteHeader path={path} />
      {isOwnerPreview && (
        <Alert role="status" className="rounded-none border-x-0 border-t-0 border-[#dfc9d0] bg-[#f7e8ed] px-5 py-4 sm:px-8">
          <EyeOffIcon />
          <AlertDescription className="text-foreground">
            非公開です（あなたにだけ表示されています）
          </AlertDescription>
        </Alert>
      )}
      <main className="mx-auto max-w-[1280px] px-5 pb-20 sm:px-8 lg:px-12">
        <nav aria-label="パンくずリスト" className="flex flex-wrap items-center gap-x-3 gap-y-2 py-7 text-xs leading-6 text-[#79656a] sm:py-9">
          <Link href={`/s/${store.slug}`} className="inline-flex items-center gap-2 rounded-sm py-1 break-words underline-offset-4 hover:text-[#a53962] hover:underline"><ArrowLeftIcon aria-hidden="true" className="size-3.5 shrink-0" />{store.name}</Link>
          <ChevronRightIcon aria-hidden="true" className="size-3 shrink-0" />
          <span aria-current="page" className="break-words">{product.name}</span>
        </nav>
        <div className="grid items-start gap-9 md:grid-cols-[1.15fr_1fr] md:gap-10 lg:gap-16">
          <div className="min-w-0"><ProductGallery name={product.name} images={product.images} /></div>
          <div className="min-w-0 py-1 lg:py-5">
            <Link href={`/s/${store.slug}`} className="inline-block rounded-sm text-xs tracking-[.08em] break-words text-[#9b657c] underline-offset-4 hover:underline">{store.name}</Link>
            <h1 className="mt-4 font-serif text-2xl leading-[1.65] font-medium tracking-[.025em] break-words lg:text-[2rem]">{product.name}</h1>
            <p className="mt-6 text-2xl font-medium tracking-wide sm:text-[1.75rem]">{formatPrice(product.price)}</p>
            <div className="mt-4 flex items-center gap-2.5">
              {product.stock > 0 ? (
                <><span aria-hidden="true" className="size-1.5 rounded-full bg-[#7d9271]" /><p className="text-sm text-[#7a6669]">{`在庫 ${product.stock} 点`}</p></>
              ) : <Badge className="border-0 bg-[#f3dce1] px-3 py-1.5 text-[#874c5f]">売り切れ</Badge>}
            </div>
            {!isOwnerPreview && (
              <div className="mt-8 border-y border-[#eaded9] py-7 [&_button]:min-h-12 [&_form>div]:flex-wrap [&_form>div]:gap-4 [&_form>div>button]:flex-1 [&_form>button]:w-full">
                <AddToCartForm productId={product.id} path={path} signedIn={viewerSub !== null} stock={product.stock} isOwnStore={viewerSub !== null && viewerSub === store.ownerSub} onAccent={onAccent} />
              </div>
            )}
            {product.description && <section aria-labelledby="product-description" className="mt-8"><h2 id="product-description" className="text-sm font-medium tracking-[.04em]">商品について</h2><p className="mt-4 text-sm leading-8 whitespace-pre-line break-words text-[#7a6669]">{product.description}</p></section>}
            <div className="mt-9 flex items-start gap-3 rounded-2xl bg-[#f5ede7] px-5 py-5 text-xs text-[#7a6669]"><WalletIcon aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-[#a47789]" strokeWidth={1.4} /><div><p className="font-medium text-[#694d58]">お支払いについて</p><p className="mt-1.5 leading-6">お支払いは、このストアが案内する方法で行います。注文時のお支払い方法の案内をご確認ください。</p></div></div>
          </div>
        </div>
        {others.length > 0 && (
          <section aria-labelledby="other-products-title" className="mt-16 sm:mt-20">
            <div className="mb-7"><p className="text-[10px] tracking-[.2em] text-[#79656a]">MORE FROM THIS STORE</p><h2 id="other-products-title" className="mt-2.5 font-serif text-2xl font-medium tracking-[.04em]">このストアのほかの商品</h2></div>
            <ProductGrid products={others.map((item) => ({ ...item, href: `/s/${store.slug}/products/${item.id}` }))} filtered={false} />
          </section>
        )}
        <div className="mt-14 flex flex-col items-center justify-between gap-5 rounded-[1.75rem] border border-[#eaded9] bg-white/40 px-6 py-8 sm:mt-20 sm:flex-row sm:px-9"><p className="text-sm leading-7 break-words text-[#7a6669]">{store.name}の、ほかの商品もご覧ください。</p><Button asChild variant="outline" className="border-[#dfc9d0] bg-transparent px-6 text-[#a53962]"><Link href={`/s/${store.slug}`}>ストアに戻る<ArrowUpRightIcon aria-hidden="true" className="ml-2 size-4" /></Link></Button></div>
      </main>
      <footer className="border-t border-[#eaded9] px-5 py-7 text-center text-[10px] tracking-[.08em] text-[#79656a]">Powered by Candy Rain Stores</footer>
    </div>
  )
}

import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { EyeOffIcon } from "lucide-react"
import { cache } from "react"
import { deps } from "@/app/dashboard/deps"
import { SiteHeader } from "@/app/components/SiteHeader"
import { Storefront } from "@/app/components/atelier/Storefront"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { getSub } from "@/lib/session"
import { normalizeSlug } from "@/lib/storeValidation"
import { listProductsForStorePage } from "@/services/productService"
import { getStoreForViewer } from "@/services/storeService"

type Props = { params: Promise<{ slug: string }> }

const load = cache(async (params: Props["params"]) => {
  const { slug } = await params
  const viewerSub = await getSub()
  const found = await getStoreForViewer(deps(), normalizeSlug(slug), viewerSub)
  if (!found) return null
  const { store } = found
  const products = await listProductsForStorePage(
    deps(),
    store.id,
    viewerSub !== null && viewerSub === store.ownerSub,
  )
  return { ...found, products }
})

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const found = await load(params)
  return found ? { title: found.store.name } : {}
}

export default async function StorePage({ params }: Props) {
  const found = await load(params)
  if (!found) notFound()
  const { store, isOwnerPreview, products } = found

  return (
    <div style={{ "--store-color": store.themeColor } as React.CSSProperties}>
      <SiteHeader path={`/s/${store.slug}`} />
      {isOwnerPreview && (
        <Alert role="status" className="rounded-none border-x-0 border-t-0 border-[#dfc9d0] bg-[#f7e8ed] px-5 py-4 sm:px-8">
          <EyeOffIcon />
          <AlertDescription className="text-foreground flex flex-wrap items-center justify-between gap-2">
            <span>非公開です（あなたにだけ表示されています）</span>
            <Link href="/dashboard" className="underline underline-offset-4">
              ダッシュボードに戻る
            </Link>
          </AlertDescription>
        </Alert>
      )}
      <Storefront store={store} products={products.map((product) => ({ ...product, href: `/s/${store.slug}/products/${product.id}` }))} />
    </div>
  )
}

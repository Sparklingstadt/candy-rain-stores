import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { EyeOffIcon } from "lucide-react"
import { cache } from "react"
import { deps } from "@/app/dashboard/deps"
import { SiteHeader } from "@/app/components/SiteHeader"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { getSub } from "@/lib/session"
import { normalizeSlug } from "@/lib/storeValidation"
import { listProductsForStorePage } from "@/services/productService"
import { getStoreForViewer } from "@/services/storeService"
import { ProductGrid } from "./ProductGrid"

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
        <Alert className="rounded-none border-x-0 border-t-0">
          <EyeOffIcon />
          <AlertDescription className="text-foreground flex flex-wrap items-center justify-between gap-2">
            <span>非公開です（あなたにだけ表示されています）</span>
            <Link href="/dashboard" className="underline underline-offset-4">
              ダッシュボードに戻る
            </Link>
          </AlertDescription>
        </Alert>
      )}
      {store.headerUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={store.headerUrl} alt="" className="h-40 w-full object-cover sm:h-56" />
      ) : (
        <div className="h-24 w-full border-b bg-(--store-color) sm:h-32" />
      )}
      <main className="mx-auto max-w-2xl space-y-6 p-4">
        <header className="flex items-center gap-4">
          {store.logoUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={store.logoUrl}
              alt={`${store.name}のロゴ`}
              className="h-16 w-16 rounded object-cover"
            />
          )}
          <h1 className="border-l-4 border-(--store-color) pl-3 text-2xl font-bold">{store.name}</h1>
        </header>
        {store.description && <p className="whitespace-pre-line">{store.description}</p>}
        <section className="border-t pt-6">
          <ProductGrid slug={store.slug} products={products} />
        </section>
      </main>
    </div>
  )
}

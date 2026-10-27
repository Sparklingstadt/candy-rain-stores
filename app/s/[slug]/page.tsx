import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { EyeOffIcon } from "lucide-react"
import { cache } from "react"
import { deps } from "@/app/dashboard/deps"
import { SiteHeader } from "@/app/components/SiteHeader"
import { Storefront } from "@/app/components/atelier/Storefront"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select"
import { getSub } from "@/lib/session"
import { normalizeSlug } from "@/lib/storeValidation"
import { cn } from "@/lib/utils"
import { listProductsForStorePage } from "@/services/productService"
import { getStoreForViewer } from "@/services/storeService"

type Props = {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

const FILTERS = [
  { value: "all", label: "すべて" },
  { value: "available", label: "販売中" },
  { value: "soldout", label: "売り切れ" },
] as const
type Filter = (typeof FILTERS)[number]["value"]

const SORTS = [
  { value: "new", label: "新しい順" },
  { value: "price", label: "価格の安い順" },
] as const
type Sort = (typeof SORTS)[number]["value"]

// Unknown or repeated values fall back to the defaults (all / new).
function parseFilter(raw: string | string[] | undefined): Filter {
  return FILTERS.find((f) => f.value === raw)?.value ?? "all"
}

function parseSort(raw: string | string[] | undefined): Sort {
  return SORTS.find((s) => s.value === raw)?.value ?? "new"
}

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

function tabHref(slug: string, filter: Filter, sort: Sort): string {
  const query = new URLSearchParams()
  if (filter !== "all") query.set("filter", filter)
  if (sort !== "new") query.set("sort", sort)
  const qs = query.toString()
  return `/s/${slug}${qs ? `?${qs}` : ""}`
}

export default async function StorePage({ params, searchParams }: Props) {
  const found = await load(params)
  if (!found) notFound()
  const { store, isOwnerPreview, products } = found
  const query = await searchParams
  const filter = parseFilter(query.filter)
  const sort = parseSort(query.sort)

  // Counts and the 販売中/売り切れ tabs cover published products only, so the owner sees the buyers' numbers.
  const published = products.filter((p) => p.isPublished)
  const availableCount = published.filter((p) => p.stock > 0).length
  const soldOutCount = published.length - availableCount
  const visible = products
    .filter((p) => (filter === "available" ? p.isPublished && p.stock > 0 : filter === "soldout" ? p.isPublished && p.stock === 0 : true))
    // Array.prototype.sort is stable, so equal prices keep the newest-first order
    .sort((a, b) => (sort === "price" ? a.price - b.price : 0))

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
      <Storefront
        store={store}
        products={products.map((product) => ({ ...product, href: `/s/${store.slug}/products/${product.id}` }))}
        visibleProducts={visible.map((product) => ({ ...product, href: `/s/${store.slug}/products/${product.id}` }))}
        filtered={products.length > 0 && filter !== "all"}
        counts={{ published: published.length, available: availableCount, soldOut: soldOutCount }}
        catalogControls={
          <div className="mb-7 flex flex-wrap items-center justify-between gap-x-5 gap-y-2 border-b border-[#eaded9] pb-2">
            <nav aria-label="商品の絞り込み" className="flex gap-1">
              {FILTERS.map((f) => (
                <Link
                  key={f.value}
                  href={tabHref(store.slug, f.value, sort)}
                  aria-current={f.value === filter ? "page" : undefined}
                  className={cn(
                    "rounded-full px-4 py-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-[#a53962] focus-visible:ring-offset-2",
                    f.value === filter ? "bg-[#f3dce1] font-semibold text-[#874c5f]" : "text-[#7a6669] hover:bg-[#f3dce1]/40 hover:text-[#4b3439]",
                  )}
                >
                  {f.label}
                </Link>
              ))}
            </nav>
            <form method="get" className="flex flex-wrap items-center gap-2 py-2">
              {filter !== "all" && <input type="hidden" name="filter" value={filter} />}
              <label htmlFor="store-sort" className="text-xs text-[#7a6669]">並び順</label>
              <NativeSelect key={sort} id="store-sort" name="sort" size="sm" defaultValue={sort}>
                {SORTS.map((s) => <NativeSelectOption key={s.value} value={s.value}>{s.label}</NativeSelectOption>)}
              </NativeSelect>
              <Button type="submit" variant="outline" size="sm">並べ替え</Button>
            </form>
          </div>
        }
      />
    </div>
  )
}

import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { EyeOffIcon } from "lucide-react"
import { cache } from "react"
import { deps } from "@/app/dashboard/deps"
import { SiteHeader } from "@/app/components/SiteHeader"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select"
import { readableTextColor } from "@/lib/color"
import { getSub } from "@/lib/session"
import { normalizeSlug } from "@/lib/storeValidation"
import { cn } from "@/lib/utils"
import { listProductsForStorePage } from "@/services/productService"
import { getStoreForViewer } from "@/services/storeService"
import { ProductGrid } from "./ProductGrid"

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

  const onAccent = readableTextColor(store.themeColor)

  return (
    <div style={{ "--store-color": store.themeColor } as React.CSSProperties}>
      <SiteHeader path={`/s/${store.slug}`} />
      {isOwnerPreview && (
        <Alert role="status" className="rounded-none border-x-0 border-t-0">
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
        <img src={store.headerUrl} alt="" className="h-[200px] w-full object-cover md:h-[320px]" />
      ) : (
        <div className="h-[200px] w-full bg-(--store-color) opacity-90 md:h-[320px]" />
      )}
      <div className="mx-auto max-w-[1440px] px-4 sm:px-8">
        <div className="-mt-12 flex flex-wrap items-start gap-x-6 gap-y-3 md:-mt-16">
          {store.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={store.logoUrl}
              alt={`${store.name}のロゴ`}
              className="border-background bg-background size-24 shrink-0 rounded-3xl border-4 object-cover shadow-sm md:size-32"
            />
          ) : (
            <div
              aria-hidden="true"
              className="border-background flex size-24 shrink-0 items-center justify-center rounded-3xl border-4 bg-(--store-color) text-4xl font-bold shadow-sm md:size-32 md:text-5xl"
              style={{ color: onAccent }}
            >
              {Array.from(store.name)[0]}
            </div>
          )}
          <div className="flex min-w-0 flex-[1_1_340px] flex-col gap-1.5 pb-2 min-[492px]:pt-14 md:pt-[72px]">
            <h1 className="text-2xl leading-tight font-bold wrap-anywhere md:text-3xl">{store.name}</h1>
            <p className="text-muted-foreground text-sm">
              /s/{store.slug}・商品 {published.length} 点
            </p>
          </div>
          <div className="self-end pb-2">
            <Button
              asChild
              size="lg"
              className="h-11 rounded-[10px] bg-(--store-color) px-5 font-semibold hover:bg-(--store-color)/90"
              style={{ color: onAccent }}
            >
              <a href="#products">商品を見る</a>
            </Button>
          </div>
        </div>

        <main className="mt-8 flex flex-wrap items-start gap-8 pb-16">
          <aside className="flex w-full min-w-0 flex-col gap-4 md:w-auto md:max-w-[320px] md:flex-[1_1_280px]">
            {store.description && (
              <Card className="gap-2.5 p-5">
                <h2 className="text-[15px] font-semibold">ストアについて</h2>
                <p className="text-card-foreground/80 text-sm leading-[1.7] wrap-anywhere whitespace-pre-line">
                  {store.description}
                </p>
              </Card>
            )}
            {store.paymentInstructions && (
              <Card className="gap-2.5 p-5">
                <h2 className="text-[15px] font-semibold">お支払い方法</h2>
                <p className="text-card-foreground/80 text-sm leading-[1.7] wrap-anywhere whitespace-pre-line">
                  {store.paymentInstructions}
                </p>
              </Card>
            )}
            <Card className="grid grid-cols-2 gap-3 p-5">
              <div className="flex flex-col gap-0.5">
                <span className="text-muted-foreground text-xs">販売中</span>
                <span className="text-xl font-bold tabular-nums">{availableCount}</span>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-muted-foreground text-xs">売り切れ</span>
                <span className="text-xl font-bold tabular-nums">{soldOutCount}</span>
              </div>
            </Card>
          </aside>

          <section id="products" className="flex min-w-0 flex-[999_1_100%] scroll-mt-4 flex-col gap-5 md:flex-[999_1_560px]">
            <div className="flex flex-wrap items-center justify-between gap-x-3 border-b">
              <nav aria-label="商品の絞り込み" className="-mb-px flex gap-1">
                {FILTERS.map((f) => (
                  <Link
                    key={f.value}
                    href={tabHref(store.slug, f.value, sort)}
                    aria-current={f.value === filter ? "page" : undefined}
                    className={cn(
                      "focus-visible:ring-ring/50 rounded-t-md border-b-2 border-transparent px-4 py-3 text-sm outline-none focus-visible:ring-[3px]",
                      f.value === filter
                        ? "border-(--store-color) font-semibold"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {f.label}
                  </Link>
                ))}
              </nav>
              <form method="get" className="flex items-center gap-2 py-2">
                {filter !== "all" && <input type="hidden" name="filter" value={filter} />}
                <label htmlFor="store-sort" className="text-muted-foreground text-[13px]">
                  並び順
                </label>
                <NativeSelect id="store-sort" name="sort" size="sm" defaultValue={sort}>
                  {SORTS.map((s) => (
                    <NativeSelectOption key={s.value} value={s.value}>
                      {s.label}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
                <Button type="submit" variant="outline" size="sm">
                  並べ替え
                </Button>
              </form>
            </div>
            <ProductGrid slug={store.slug} products={visible} filtered={products.length > 0 && filter !== "all"} />
          </section>
        </main>
      </div>
    </div>
  )
}

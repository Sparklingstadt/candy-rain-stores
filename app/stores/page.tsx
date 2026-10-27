import type { Metadata } from "next"
import Link from "next/link"
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react"
import { deps } from "@/app/dashboard/deps"
import { SiteHeader } from "@/app/components/SiteHeader"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { readableTextColor } from "@/lib/color"
import { listPublishedStores } from "@/services/storeService"

export const metadata: Metadata = { title: "ストア一覧" }

const PAGE_SIZE = 24

type Props = { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }

// 1-based. Anything that is not a plain positive integer (or is repeated) counts as page 1.
function parsePage(raw: string | string[] | undefined): number {
  return typeof raw === "string" && /^[1-9]\d{0,5}$/.test(raw) ? Number(raw) : 1
}

function pageHref(page: number): string {
  return page <= 1 ? "/stores" : `/stores?page=${page}`
}

export default async function StoresPage({ searchParams }: Props) {
  let page = parsePage((await searchParams).page)
  let result = await listPublishedStores(deps(), page, PAGE_SIZE)
  if (page > 1 && result.stores.length === 0) {
    // past the last page: show the first one
    page = 1
    result = await listPublishedStores(deps(), page, PAGE_SIZE)
  }
  const { stores, hasNext } = result

  return (
    <div>
      <SiteHeader path={pageHref(page)} />
      <main className="mx-auto max-w-[1440px] px-4 pt-8 pb-16 sm:px-8">
        <h1 className="mb-6 text-2xl font-bold tracking-tight">ストア一覧</h1>
        {stores.length === 0 ? (
          <p className="text-muted-foreground py-8 text-center">まだ公開中のストアはありません</p>
        ) : (
          <ul className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {stores.map((store) => (
              <li key={store.id} className="min-w-0">
                <Link
                  href={`/s/${store.slug}`}
                  style={{ "--store-color": store.themeColor } as React.CSSProperties}
                  className="focus-visible:ring-ring/50 block h-full rounded-xl outline-none focus-visible:ring-[3px]"
                >
                  <Card className="hover:bg-accent/50 h-full gap-0 overflow-hidden py-0 transition-colors">
                    {store.headerUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={store.headerUrl} alt="" className="h-24 w-full object-cover" />
                    ) : (
                      <div className="h-24 w-full bg-(--store-color) opacity-90" />
                    )}
                    <div className="flex flex-1 flex-col gap-2 px-4 pt-0 pb-4">
                      {store.logoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={store.logoUrl}
                          alt=""
                          className="border-background bg-background relative -mt-7 size-14 shrink-0 rounded-2xl border-4 object-cover shadow-sm"
                        />
                      ) : (
                        <div
                          aria-hidden="true"
                          className="border-background relative -mt-7 flex size-14 shrink-0 items-center justify-center rounded-2xl border-4 bg-(--store-color) text-xl font-bold shadow-sm"
                          style={{ color: readableTextColor(store.themeColor) }}
                        >
                          {Array.from(store.name)[0]}
                        </div>
                      )}
                      <p className="font-semibold wrap-anywhere">{store.name}</p>
                      {store.description && (
                        <p className="text-muted-foreground line-clamp-2 text-sm wrap-anywhere">
                          {store.description}
                        </p>
                      )}
                      <p className="text-muted-foreground mt-auto pt-1 text-xs tabular-nums">
                        商品 {store.publishedProductCount} 点
                      </p>
                    </div>
                  </Card>
                </Link>
              </li>
            ))}
          </ul>
        )}
        {(page > 1 || hasNext) && (
          <nav aria-label="ページ送り" className="mt-8 flex items-center justify-between gap-3">
            {page > 1 ? (
              <Button asChild variant="outline">
                <Link href={pageHref(page - 1)} rel="prev">
                  <ChevronLeftIcon />
                  前へ
                </Link>
              </Button>
            ) : (
              <span />
            )}
            {hasNext && (
              <Button asChild variant="outline">
                <Link href={pageHref(page + 1)} rel="next">
                  次へ
                  <ChevronRightIcon />
                </Link>
              </Button>
            )}
          </nav>
        )}
      </main>
    </div>
  )
}

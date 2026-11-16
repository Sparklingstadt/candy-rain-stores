import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { cache } from "react"
import { SiteHeader } from "@/app/components/SiteHeader"
import { getSub } from "@/lib/session"
import { deps } from "@/services/deps"
import { listProductsForStorePage } from "@/services/productService"
import { getStore } from "@/services/storeService"
import { Landing } from "./Landing"
import { StorePage } from "./StorePage"

type Props = { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }

const load = cache(async () => {
  const viewerSub = await getSub()
  const store = await getStore(deps())
  if (!store) return { kind: "no_store" as const, viewerSub }
  const isOwner = viewerSub !== null && viewerSub === store.ownerSub
  if (!store.isPublished && !isOwner) return { kind: "closed" as const, store }
  const products = await listProductsForStorePage(deps(), isOwner)
  return { kind: "open" as const, store, products, isOwnerPreview: !store.isPublished }
})

export async function generateMetadata(): Promise<Metadata> {
  const found = await load()
  return found.kind === "open" ? { title: found.store.name } : {}
}

export default async function HomePage({ searchParams }: Props) {
  const found = await load()
  if (found.kind === "no_store") {
    // お店がまだない。ログイン済みならダッシュボードで作ってもらう
    if (found.viewerSub) redirect("/dashboard")
    return <Landing />
  }
  if (found.kind === "closed") {
    return (
      <div>
        <SiteHeader path="/" />
        <main className="mx-auto max-w-2xl space-y-3 px-5 py-16 text-center">
          <h1 className="text-xl font-semibold">ただいま準備中です</h1>
          <p className="text-muted-foreground text-sm">お店の公開まで、もうしばらくお待ちください。</p>
        </main>
      </div>
    )
  }
  return (
    <StorePage
      store={found.store}
      products={found.products}
      isOwnerPreview={found.isOwnerPreview}
      query={await searchParams}
    />
  )
}

import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { getImageStorage } from "@/lib/imageStorage"
import { prisma } from "@/lib/prisma"
import { getSub } from "@/lib/session"
import { normalizeSlug } from "@/lib/storeValidation"
import { getStoreForViewer } from "@/services/storeService"

type Props = { params: Promise<{ slug: string }> }

async function load(params: Props["params"]) {
  const { slug } = await params
  return getStoreForViewer(
    { db: prisma, storage: getImageStorage() },
    normalizeSlug(slug),
    await getSub(),
  )
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const found = await load(params)
  return found ? { title: found.store.name } : {}
}

export default async function StorePage({ params }: Props) {
  const found = await load(params)
  if (!found) notFound()
  const { store, isOwnerPreview } = found

  return (
    <div style={{ "--store-color": store.themeColor } as React.CSSProperties}>
      {isOwnerPreview && (
        <div className="flex flex-wrap items-center justify-between gap-2 bg-gray-800 px-4 py-2 text-sm text-white">
          <span>非公開です（あなたにだけ表示されています）</span>
          <Link href="/dashboard" className="underline">
            ダッシュボードに戻る
          </Link>
        </div>
      )}
      {store.headerUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={store.headerUrl} alt="" className="h-40 w-full object-cover sm:h-56" />
      ) : (
        <div className="h-24 w-full bg-(--store-color) sm:h-32" />
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
          <h1 className="text-2xl font-bold text-(--store-color)">{store.name}</h1>
        </header>
        {store.description && <p className="whitespace-pre-line">{store.description}</p>}
        <section className="border-t pt-4">
          <p className="text-gray-600">商品はまだありません</p>
        </section>
      </main>
    </div>
  )
}

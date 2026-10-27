import Link from "next/link"
import { SignOutButton } from "@/app/components/SignOutButton"
import { requireSub } from "@/lib/session"
import { getOwnStore } from "@/services/storeService"
import { setPublishedAction } from "./actions"
import { deps } from "./deps"
import { DeleteStoreForm } from "./DeleteStoreForm"
import { StoreForm } from "./StoreForm"

export default async function DashboardPage() {
  const sub = await requireSub()
  const store = await getOwnStore(deps(), sub)

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-4">
      <header className="flex items-center justify-between border-b pb-3">
        <span className="font-bold">Candy Rain Stores</span>
        <SignOutButton />
      </header>

      {store === null ? (
        <StoreForm />
      ) : (
        <>
          <section
            className="space-y-3 rounded border-l-8 p-4"
            style={{ borderLeftColor: store.themeColor }}
          >
            <h1 className="text-xl font-bold">{store.name}</h1>
            <p className="text-sm">{store.isPublished ? "公開中" : "非公開"}</p>
            <div className="flex flex-wrap items-center gap-3">
              <form action={setPublishedAction}>
                <input type="hidden" name="publish" value={store.isPublished ? "false" : "true"} />
                <button type="submit" className="rounded border px-4 py-2">
                  {store.isPublished ? "非公開にする" : "公開する"}
                </button>
              </form>
              <Link href={`/s/${store.slug}`} className="text-blue-700 underline">
                ストアページを見る
              </Link>
              <Link href="/dashboard/products" className="text-blue-700 underline">
                商品を管理
              </Link>
            </div>
          </section>
          <StoreForm
            store={{
              slug: store.slug,
              name: store.name,
              description: store.description,
              themeColor: store.themeColor,
              logoUrl: store.logoUrl,
              headerUrl: store.headerUrl,
            }}
          />
          <DeleteStoreForm slug={store.slug} />
        </>
      )}
    </div>
  )
}

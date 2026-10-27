import Link from "next/link"
import { SignOutButton } from "@/app/components/SignOutButton"
import { readableTextColor } from "@/lib/color"
import { requireSub } from "@/lib/session"
import { countReceivedOrders } from "@/services/orderService"
import { getOwnStore } from "@/services/storeService"
import { deps } from "./deps"
import { DashboardNav } from "./DashboardNav"

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const sub = await requireSub()
  const store = await getOwnStore(deps(), sub)

  // No store yet (the create form): no nav, just the page under a plain header.
  if (!store) {
    return (
      <div className="mx-auto max-w-3xl space-y-6 p-4 sm:p-8">
        <header className="flex items-center justify-between border-b pb-3">
          <span className="font-bold">Candy Rain Stores</span>
          <SignOutButton />
        </header>
        {children}
      </div>
    )
  }

  const receivedCount = await countReceivedOrders(deps(), sub)

  return (
    <div
      className="bg-muted/40 flex min-h-svh flex-wrap items-stretch"
      style={{ "--store-color": store.themeColor } as React.CSSProperties}
    >
      <aside className="bg-background grid w-full grid-cols-[1fr_auto] content-start items-center gap-x-3 gap-y-4 border-b p-4 lg:flex lg:sticky lg:top-0 lg:h-svh lg:w-auto lg:max-w-[260px] lg:flex-[1_1_240px] lg:flex-col lg:self-start lg:items-stretch lg:gap-6 lg:border-r lg:border-b-0 lg:px-4 lg:py-5">
        <Link href="/" className="px-2 font-bold lg:text-base">
          Candy Rain Stores
        </Link>
        <div className="lg:order-last lg:mt-auto lg:px-2">
          <SignOutButton />
        </div>
        <DashboardNav
          storeName={store.name}
          slug={store.slug}
          isPublished={store.isPublished}
          logoUrl={store.logoUrl}
          onAccent={readableTextColor(store.themeColor)}
          receivedCount={receivedCount}
        />
      </aside>
      <main className="flex min-w-0 flex-[999_1_100%] flex-col gap-6 p-4 sm:p-8 lg:flex-[999_1_560px]">
        {children}
      </main>
    </div>
  )
}

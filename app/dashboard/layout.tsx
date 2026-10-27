import { DashboardShell } from "@/app/components/atelier/DashboardShell"
import { SignOutButton } from "@/app/components/SignOutButton"
import { UserMenu } from "@/app/components/UserMenu"
import { readableTextColor } from "@/lib/color"
import { getBuyer, requireSub } from "@/lib/session"
import { countReceivedOrders } from "@/services/orderService"
import { getOwnStore } from "@/services/storeService"
import { deps } from "./deps"
import { DashboardNav } from "./DashboardNav"

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const sub = await requireSub()
  const [store, buyer] = await Promise.all([getOwnStore(deps(), sub), getBuyer()])
  const receivedCount = store ? await countReceivedOrders(deps(), sub) : 0

  return (
    <DashboardShell
      title=""
      active="home"
      brandHref="/stores"
      showPageHeader={false}
      showNavigation={store !== null}
      accountAction={<><SignOutButton />{buyer && <UserMenu name={buyer.name.trim()} email={buyer.email} image={buyer.image} />}</>}
      navigation={store ? (
        <DashboardNav
          storeName={store.name}
          slug={store.slug}
          isPublished={store.isPublished}
          logoUrl={store.logoUrl}
          themeColor={store.themeColor}
          onAccent={readableTextColor(store.themeColor)}
          receivedCount={receivedCount}
        />
      ) : undefined}
    >
      {children}
    </DashboardShell>
  )
}

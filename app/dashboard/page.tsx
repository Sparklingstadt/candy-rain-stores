import Link from "next/link"
import { SignOutButton } from "@/app/components/SignOutButton"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { requireSub } from "@/lib/session"
import { countReceivedOrders } from "@/services/orderService"
import { getOwnStore } from "@/services/storeService"
import { setPublishedAction } from "./actions"
import { deps } from "./deps"
import { DeleteStoreForm } from "./DeleteStoreForm"
import { StoreForm } from "./StoreForm"

export default async function DashboardPage() {
  const sub = await requireSub()
  const store = await getOwnStore(deps(), sub)
  const receivedCount = store ? await countReceivedOrders(deps(), sub) : 0

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
          <Card className="border-l-8" style={{ borderLeftColor: store.themeColor }}>
            <CardHeader>
              <CardTitle>
                <h1 className="text-xl font-bold">{store.name}</h1>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Badge variant={store.isPublished ? "default" : "secondary"}>
                {store.isPublished ? "公開中" : "非公開"}
              </Badge>
              <div className="flex flex-wrap items-center gap-3">
                <form action={setPublishedAction}>
                  <input type="hidden" name="publish" value={store.isPublished ? "false" : "true"} />
                  <Button type="submit" variant="outline">
                    {store.isPublished ? "非公開にする" : "公開する"}
                  </Button>
                </form>
                <Button asChild variant="outline">
                  <Link href={`/s/${store.slug}`}>ストアページを見る</Link>
                </Button>
                <Button asChild variant="outline">
                  <Link href="/dashboard/products">商品を管理</Link>
                </Button>
                <Button asChild variant="outline">
                  <Link href="/dashboard/orders">注文を管理（受付 {receivedCount} 件）</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
          <StoreForm
            store={{
              slug: store.slug,
              name: store.name,
              description: store.description,
              themeColor: store.themeColor,
              paymentInstructions: store.paymentInstructions,
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

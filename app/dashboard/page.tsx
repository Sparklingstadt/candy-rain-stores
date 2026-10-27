import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { requireSub } from "@/lib/session"
import { getOwnStore } from "@/services/storeService"
import { setPublishedAction } from "./actions"
import { deps } from "./deps"
import { DeleteStoreForm } from "./DeleteStoreForm"
import { StoreForm } from "./StoreForm"

export default async function DashboardPage() {
  const sub = await requireSub()
  const store = await getOwnStore(deps(), sub)

  // Without a store the layout shows no nav; the create form sits alone.
  if (store === null) return <StoreForm />

  return (
    <div className="w-full max-w-3xl space-y-6">
      <Card className="border-l-8" style={{ borderLeftColor: store.themeColor }}>
        <CardHeader>
          <CardTitle>
            <h1 className="text-xl font-bold wrap-anywhere">{store.name}</h1>
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-3">
          <Badge variant={store.isPublished ? "default" : "secondary"}>
            {store.isPublished ? "公開中" : "非公開"}
          </Badge>
          <form action={setPublishedAction}>
            <input type="hidden" name="publish" value={store.isPublished ? "false" : "true"} />
            <Button type="submit" variant="outline">
              {store.isPublished ? "非公開にする" : "公開する"}
            </Button>
          </form>
        </CardContent>
      </Card>
      <StoreForm
        store={{
          slug: store.slug,
          name: store.name,
          description: store.description,
          themeColor: store.themeColor,
          paymentInstructions: store.paymentInstructions,
          contactEmail: store.contactEmail,
          logoUrl: store.logoUrl,
          headerUrl: store.headerUrl,
        }}
      />
      <DeleteStoreForm slug={store.slug} />
    </div>
  )
}

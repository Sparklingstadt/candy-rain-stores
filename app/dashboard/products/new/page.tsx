import Link from "next/link"
import { redirect } from "next/navigation"
import { requireSub } from "@/lib/session"
import { getOwnStore } from "@/services/storeService"
import { deps } from "../../deps"
import { ProductForm } from "../ProductForm"

export default async function NewProductPage() {
  const sub = await requireSub()
  const store = await getOwnStore(deps(), sub)
  if (!store) redirect("/dashboard")

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-4">
      <ProductForm />
      <Link href="/dashboard/products" className="text-blue-700 underline">
        商品一覧に戻る
      </Link>
    </div>
  )
}

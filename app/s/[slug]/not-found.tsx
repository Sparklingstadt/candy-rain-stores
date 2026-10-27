import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function StoreNotFound() {
  return (
    <main className="mx-auto max-w-2xl space-y-4 p-4">
      <h1 className="text-xl font-bold">ストアが見つかりません</h1>
      <Button asChild variant="outline">
        <Link href="/">トップへ戻る</Link>
      </Button>
    </main>
  )
}

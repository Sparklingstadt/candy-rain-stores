import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function ProductNotFound() {
  return (
    <main className="mx-auto max-w-2xl space-y-4 p-4">
      <h1 className="text-xl font-bold">商品が見つかりません</h1>
      <p>
        <Button asChild variant="outline">
          <Link href="/">ストアに戻る</Link>
        </Button>
      </p>
    </main>
  )
}

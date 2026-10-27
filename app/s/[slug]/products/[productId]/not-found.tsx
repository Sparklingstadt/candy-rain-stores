"use client"

import Link from "next/link"
import { useParams } from "next/navigation"
import { Button } from "@/components/ui/button"

export default function ProductNotFound() {
  const { slug } = useParams<{ slug: string }>()
  return (
    <main className="mx-auto max-w-2xl space-y-4 p-4">
      <h1 className="text-xl font-bold">商品が見つかりません</h1>
      <p>
        <Button asChild variant="outline">
          <Link href={`/s/${slug}`}>ストアに戻る</Link>
        </Button>
      </p>
    </main>
  )
}

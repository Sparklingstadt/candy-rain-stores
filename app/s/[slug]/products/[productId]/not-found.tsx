"use client"

import Link from "next/link"
import { useParams } from "next/navigation"

export default function ProductNotFound() {
  const { slug } = useParams<{ slug: string }>()
  return (
    <main className="mx-auto max-w-2xl space-y-4 p-4">
      <h1 className="text-xl font-bold">商品が見つかりません</h1>
      <p>
        <Link href={`/s/${slug}`} className="text-blue-700 underline">
          ストアに戻る
        </Link>
      </p>
    </main>
  )
}

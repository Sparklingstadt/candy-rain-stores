import Link from "next/link"

export default function StoreNotFound() {
  return (
    <main className="mx-auto max-w-2xl space-y-4 p-4">
      <h1 className="text-xl font-bold">ストアが見つかりません</h1>
      <Link href="/" className="text-blue-700 underline">
        トップへ戻る
      </Link>
    </main>
  )
}

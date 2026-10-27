"use client"

import { useState, useTransition } from "react"
import { deleteProductAction } from "./actions"

export function DeleteProductForm({ productId }: { productId: string }) {
  const [confirming, setConfirming] = useState(false)
  const [pending, startTransition] = useTransition()

  return (
    <section className="space-y-3 rounded border border-red-300 p-4">
      {confirming ? (
        <>
          <p className="text-sm font-medium text-red-700">本当に削除しますか？</p>
          <div className="flex gap-3">
            <button
              type="button"
              disabled={pending}
              onClick={() => startTransition(() => deleteProductAction(productId))}
              className="rounded bg-red-600 px-4 py-2 text-white disabled:opacity-50"
            >
              削除する
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => setConfirming(false)}
              className="rounded border px-4 py-2"
            >
              やめる
            </button>
          </div>
        </>
      ) : (
        <button
          type="button"
          onClick={() => setConfirming(true)}
          className="rounded border border-red-600 px-4 py-2 text-red-700"
        >
          商品を削除
        </button>
      )}
    </section>
  )
}

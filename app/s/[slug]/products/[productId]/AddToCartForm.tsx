"use client"

import Link from "next/link"
import { useActionState } from "react"
import { addToCartAction, signInToBuyAction, type AddToCartState } from "@/app/cart/actions"
import { addToCartView } from "@/lib/addToCartView"
import { MAX_QUANTITY } from "@/lib/orderValidation"

type Props = {
  productId: string
  path: string
  signedIn: boolean
  stock: number
  isOwnStore: boolean
}

export function AddToCartForm({ productId, path, signedIn, stock, isOwnStore }: Props) {
  const [state, action, pending] = useActionState<AddToCartState, FormData>(
    addToCartAction.bind(null, productId),
    {},
  )

  const view = addToCartView({ isOwnStore, stock, signedIn })
  if (view === "own_store") return <p>自分のストアの商品は購入できません</p>
  if (view === "sold_out") {
    return (
      <button type="button" disabled className="rounded border px-4 py-2 opacity-50">
        売り切れ
      </button>
    )
  }
  if (view === "sign_in") {
    return (
      <form action={signInToBuyAction.bind(null, path)}>
        <button type="submit" className="rounded border px-4 py-2">
          ログインしてカートに入れる
        </button>
      </form>
    )
  }

  return (
    <form action={action} className="space-y-2">
      <div className="flex items-center gap-2">
        <label>
          数量{" "}
          <select name="quantity" defaultValue="1" className="rounded border px-2 py-1">
            {Array.from({ length: MAX_QUANTITY }, (_, i) => i + 1).map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>
        <button type="submit" disabled={pending} className="rounded border px-4 py-2">
          カートに入れる
        </button>
      </div>
      {state.message && (
        <p role="alert" className="text-red-700">
          {state.message}
        </p>
      )}
      {state.added && (
        <p role="status">
          {state.capped ? `1 商品 ${MAX_QUANTITY} 個までです` : "カートに入れました"}{" "}
          <Link href="/cart" className="text-blue-700 underline">
            カートを見る
          </Link>
        </p>
      )}
    </form>
  )
}

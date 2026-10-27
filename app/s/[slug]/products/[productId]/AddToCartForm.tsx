"use client"

import Link from "next/link"
import { useActionState } from "react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select"
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
  if (view === "own_store") return <p className="text-muted-foreground text-sm">自分のストアの商品は購入できません</p>
  if (view === "sold_out") {
    return (
      <Button type="button" variant="outline" disabled>
        売り切れ
      </Button>
    )
  }
  if (view === "sign_in") {
    return (
      <form action={signInToBuyAction.bind(null, path)}>
        <Button type="submit">ログインしてカートに入れる</Button>
      </form>
    )
  }

  return (
    <form action={action} className="space-y-2">
      <div className="flex items-center gap-2">
        <Label>
          数量{" "}
          <NativeSelect name="quantity" defaultValue="1">
            {Array.from({ length: MAX_QUANTITY }, (_, i) => i + 1).map((n) => (
              <NativeSelectOption key={n} value={n}>
                {n}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </Label>
        <Button type="submit" disabled={pending}>
          カートに入れる
        </Button>
      </div>
      {state.message && (
        <p role="alert" className="text-destructive text-sm">
          {state.message}
        </p>
      )}
      {state.added && (
        <p role="status" className="text-sm">
          {state.capped ? `1 商品 ${MAX_QUANTITY} 個までです` : "カートに入れました"}{" "}
          <Link href="/cart" className="font-medium underline underline-offset-4">
            カートを見る
          </Link>
        </p>
      )}
    </form>
  )
}

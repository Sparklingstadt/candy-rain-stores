"use client"

import { useActionState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
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
  // text color readable on the store's theme color
  onAccent: string
}

export function AddToCartForm({ productId, path, signedIn, stock, isOwnStore, onAccent }: Props) {
  const router = useRouter()
  const [state, action, pending] = useActionState<AddToCartState, FormData>(
    addToCartAction.bind(null, productId),
    {},
  )

  // Each submission returns a new state object, so this fires once per add.
  useEffect(() => {
    if (!state.added) return
    toast.success(state.capped ? `1 商品 ${MAX_QUANTITY} 個までです` : "カートに入れました", {
      action: { label: "カートを見る", onClick: () => router.push("/cart") },
    })
  }, [state, router])

  const view = addToCartView({ isOwnStore, stock, signedIn })
  if (view === "own_store") return <p className="text-muted-foreground text-sm">自分のストアの商品は購入できません</p>
  if (view === "sold_out") {
    return (
      <Button type="button" variant="outline" disabled className="h-11 w-full rounded-[10px]">
        売り切れ
      </Button>
    )
  }
  if (view === "sign_in") {
    return (
      <form action={signInToBuyAction.bind(null, path)}>
        <Button
          type="submit"
          className="h-11 w-full rounded-[10px] bg-(--store-color) font-semibold hover:bg-(--store-color)/90"
          style={{ color: onAccent }}
        >
          ログインしてカートに入れる
        </Button>
      </form>
    )
  }

  return (
    <form action={action} className="space-y-2">
      <div className="flex flex-wrap items-end gap-3">
        <Label className="flex-col items-start gap-1.5 text-[13px]">
          数量
          <NativeSelect name="quantity" defaultValue="1" className="h-11 min-w-22 rounded-[10px]">
            {Array.from({ length: Math.min(stock, MAX_QUANTITY) }, (_, i) => i + 1).map((n) => (
              <NativeSelectOption key={n} value={n}>
                {n}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </Label>
        <Button
          type="submit"
          disabled={pending}
          className="h-11 flex-[1_1_180px] rounded-[10px] bg-(--store-color) font-semibold hover:bg-(--store-color)/90"
          style={{ color: onAccent }}
        >
          カートに入れる
        </Button>
      </div>
      {state.message && (
        <p role="alert" className="text-destructive text-sm">
          {state.message}
        </p>
      )}
    </form>
  )
}

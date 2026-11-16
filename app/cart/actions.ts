"use server"

import { revalidatePath } from "next/cache"
import { candyRainIdProviderId, signIn } from "@/auth"
import { deps } from "@/app/dashboard/deps"
import { safeReturnTo } from "@/lib/safeReturnTo"
import { getBuyer, requireBuyer } from "@/lib/session"
import { addToCart, removeFromCart, setCartQuantity } from "@/services/cartService"

export type AddToCartState = { message?: string; added?: boolean; capped?: boolean }

const SAVE_FAILED = "保存できませんでした。時間をおいてもう一度お試しください。"
const MESSAGES = {
  not_found: "この商品は現在購入できません",
  own_store: "自分のストアの商品は購入できません",
  cart_full: "カートに入れられるのは 30 種類までです",
  invalid_quantity: "数量を選び直してください",
} as const

function insufficientStockMessage(inCart: number, available: number): string {
  if (available > 0) return `在庫が足りません。あと ${available} 点までカートに入れられます`
  if (inCart > 0) return `在庫の数（${inCart} 点）だけカートに入っています`
  return "売り切れました"
}

export async function addToCartAction(
  productId: string,
  _prev: AddToCartState,
  formData: FormData,
): Promise<AddToCartState> {
  const buyer = await getBuyer()
  if (!buyer) return { message: "ログインしてください" }
  const quantity = formData.get("quantity")
  let capped = false
  try {
    const result = await addToCart(deps(), buyer.sub, productId, typeof quantity === "string" ? quantity : "")
    if (!result.ok) {
      if (result.code === "insufficient_stock") {
        return { message: insufficientStockMessage(result.inCart, result.available) }
      }
      return { message: MESSAGES[result.code] }
    }
    capped = result.capped === true
  } catch {
    return { message: SAVE_FAILED }
  }
  if (capped) return { added: true, capped: true }
  revalidatePath("/cart")
  return { added: true }
}

export async function setCartQuantityAction(itemId: string, formData: FormData): Promise<void> {
  const buyer = await requireBuyer("/cart")
  const quantity = formData.get("quantity")
  await setCartQuantity(deps(), buyer.sub, itemId, typeof quantity === "string" ? quantity : "")
  revalidatePath("/cart")
}

export async function removeFromCartAction(itemId: string): Promise<void> {
  const buyer = await requireBuyer("/cart")
  await removeFromCart(deps(), buyer.sub, itemId)
  revalidatePath("/cart")
}

export async function signInToBuyAction(returnTo: string): Promise<void> {
  await signIn(candyRainIdProviderId, { redirectTo: safeReturnTo(returnTo) })
}

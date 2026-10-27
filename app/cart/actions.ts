"use server"

import { revalidatePath } from "next/cache"
import { candyRainIdProviderId, signIn } from "@/auth"
import { deps } from "@/app/dashboard/deps"
import { safeReturnTo } from "@/lib/safeReturnTo"
import { getBuyer, requireBuyer } from "@/lib/session"
import { addToCart, removeFromCart, setCartQuantity } from "@/services/cartService"

export type AddToCartState = { message?: string; added?: boolean }

const SAVE_FAILED = "保存できませんでした。時間をおいてもう一度お試しください。"
const MESSAGES = {
  not_found: "この商品は現在購入できません",
  own_store: "自分のストアの商品は購入できません",
  cart_full: "カートに入れられるのは 30 種類までです",
  invalid_quantity: "数量を選び直してください",
} as const

export async function addToCartAction(
  productId: string,
  _prev: AddToCartState,
  formData: FormData,
): Promise<AddToCartState> {
  const buyer = await getBuyer()
  if (!buyer) return { message: "ログインしてください" }
  const quantity = formData.get("quantity")
  try {
    const result = await addToCart(deps(), buyer.sub, productId, typeof quantity === "string" ? quantity : "")
    if (!result.ok) return { message: MESSAGES[result.code] }
  } catch {
    return { message: SAVE_FAILED }
  }
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

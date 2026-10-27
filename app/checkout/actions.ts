"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { deps } from "@/app/dashboard/deps"
import { validateShipping, type ShippingErrors, type ShippingInfo } from "@/lib/orderValidation"
import { requireBuyer } from "@/lib/session"
import { placeOrder, type PlaceOrderResult } from "@/services/orderService"

export type CheckoutState = { errors?: ShippingErrors; values?: ShippingInfo; message?: string }

const SAVE_FAILED = "保存できませんでした。時間をおいてもう一度お試しください。"
const TOTAL_TOO_LARGE = "1 つのストアへの注文の合計が上限を超えています。数量を減らしてください"

function text(formData: FormData, name: string): string {
  const value = formData.get(name)
  return typeof value === "string" ? value : ""
}

export async function placeOrderAction(_prev: CheckoutState, formData: FormData): Promise<CheckoutState> {
  const buyer = await requireBuyer("/checkout")
  const values: ShippingInfo = {
    postalCode: text(formData, "postalCode"),
    prefecture: text(formData, "prefecture"),
    address: text(formData, "address"),
    phone: text(formData, "phone"),
  }
  const parsed = validateShipping(values)
  if (!parsed.ok) return { errors: parsed.errors, values }

  let result: PlaceOrderResult
  try {
    result = await placeOrder(deps(), buyer, parsed.value, text(formData, "cartVersion"))
  } catch (error) {
    console.error("placeOrderAction failed", error)
    return { message: SAVE_FAILED, values }
  }
  // 何も作っていないので、入力した値を残してこの画面で案内する
  if (!result.ok && result.code === "total_too_large") return { message: TOTAL_TOO_LARGE, values }
  revalidatePath("/cart")
  revalidatePath("/orders")
  if (!result.ok) {
    if (result.code === "empty_cart") redirect("/cart")
    // v は確定しようとしたときのカートの版。カートを直すまで案内を出し続けるのに使う
    if (result.code === "changed") redirect(`/cart?error=changed&v=${result.version}`)
    redirect("/cart?error=changed")
  }
  redirect("/orders?placed=1")
}

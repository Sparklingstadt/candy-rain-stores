"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { deps } from "@/app/dashboard/deps"
import { validateShipping, type ShippingErrors, type ShippingInfo } from "@/lib/orderValidation"
import { requireBuyer } from "@/lib/session"
import { placeOrder, type PlaceOrderResult } from "@/services/orderService"

export type CheckoutState = { errors?: ShippingErrors; values?: ShippingInfo; message?: string }

const SAVE_FAILED = "保存できませんでした。時間をおいてもう一度お試しください。"

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
    result = await placeOrder(deps(), buyer, parsed.value)
  } catch (error) {
    console.error("placeOrderAction failed", error)
    return { message: SAVE_FAILED, values }
  }
  revalidatePath("/cart")
  revalidatePath("/orders")
  if (!result.ok) redirect(result.code === "empty_cart" ? "/cart" : "/cart?error=changed")
  redirect("/orders?placed=1")
}

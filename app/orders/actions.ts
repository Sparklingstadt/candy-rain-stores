"use server"

import { revalidatePath } from "next/cache"
import { deps } from "@/app/dashboard/deps"
import { requireBuyer } from "@/lib/session"
import { cancelOrderAsBuyer } from "@/services/orderService"

const SAVE_FAILED = "保存できませんでした。時間をおいてもう一度お試しください。"
const CHANGED = "注文の状態が変わりました。画面を更新してください"

export async function cancelOrderAction(orderId: string): Promise<{ message?: string }> {
  const buyer = await requireBuyer("/orders/" + orderId)
  try {
    const result = await cancelOrderAsBuyer(deps(), buyer.sub, orderId)
    if (!result.ok) {
      revalidatePath("/orders")
      revalidatePath("/orders/" + orderId)
      return { message: CHANGED }
    }
  } catch (error) {
    console.error("cancelOrderAction failed", error)
    return { message: SAVE_FAILED }
  }
  revalidatePath("/orders")
  revalidatePath("/orders/" + orderId)
  return {}
}

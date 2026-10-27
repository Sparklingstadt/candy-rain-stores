"use server"

import { revalidatePath } from "next/cache"
import { deps } from "@/app/dashboard/deps"
import { ORDER_STATUSES, type OrderStatus } from "@/lib/orderStatus"
import { requireSub } from "@/lib/session"
import { changeOrderStatusAsOwner } from "@/services/orderService"

const SAVE_FAILED = "保存できませんでした。時間をおいてもう一度お試しください。"
const CHANGED = "注文の状態が変わりました。画面を更新してください"

export async function changeOrderStatusAction(
  orderId: string,
  to: OrderStatus,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _prev: { message?: string },
): Promise<{ message?: string }> {
  const sub = await requireSub()
  if (!ORDER_STATUSES.includes(to)) return { message: CHANGED }
  try {
    const result = await changeOrderStatusAsOwner(deps(), sub, orderId, to)
    // Keep the form mounted so the message stays visible; the owner refreshes.
    if (!result.ok) return { message: CHANGED }
  } catch (error) {
    console.error("changeOrderStatusAction failed", error)
    return { message: SAVE_FAILED }
  }
  revalidatePath("/dashboard/orders")
  revalidatePath("/dashboard/orders/" + orderId)
  revalidatePath("/dashboard")
  return {}
}

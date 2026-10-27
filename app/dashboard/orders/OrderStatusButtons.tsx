"use client"

import { useState, useTransition } from "react"
import { Button } from "@/components/ui/button"
import type { OrderStatus } from "@/lib/orderStatus"
import { changeOrderStatusAction } from "./actions"

const BUTTON_LABELS: Partial<Record<OrderStatus, string>> = {
  PAID: "支払いを確認した",
  SHIPPED: "発送した",
  CANCELED: "キャンセルする",
}

export function OrderStatusButtons({ orderId, next }: { orderId: string; next: OrderStatus[] }) {
  const [confirming, setConfirming] = useState(false)
  const [message, setMessage] = useState<string | undefined>()
  const [pending, startTransition] = useTransition()

  function change(to: OrderStatus) {
    startTransition(async () => {
      const result = await changeOrderStatusAction(orderId, to, {})
      setMessage(result.message)
      setConfirming(false)
    })
  }

  if (next.length === 0) return null

  return (
    <div className="space-y-2">
      {message && (
        <p role="alert" className="text-destructive text-sm">
          {message}
        </p>
      )}
      {confirming ? (
        <div className="border-destructive/50 space-y-3 rounded-lg border p-4">
          <p className="text-destructive font-medium">本当にキャンセルしますか？</p>
          <div className="flex gap-2">
            <Button type="button" variant="destructive" onClick={() => change("CANCELED")} disabled={pending}>
              キャンセルする
            </Button>
            <Button type="button" variant="outline" onClick={() => setConfirming(false)} disabled={pending}>
              やめる
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          {next.map((to) =>
            to === "CANCELED" ? (
              <Button key={to} type="button" variant="outline" onClick={() => setConfirming(true)} disabled={pending}>
                {BUTTON_LABELS[to]}
              </Button>
            ) : (
              <Button key={to} type="button" onClick={() => change(to)} disabled={pending}>
                {BUTTON_LABELS[to]}
              </Button>
            ),
          )}
        </div>
      )}
    </div>
  )
}

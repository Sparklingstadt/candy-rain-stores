"use client"

import { useState, useTransition } from "react"
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
        <p role="alert" className="text-sm text-red-600">
          {message}
        </p>
      )}
      {confirming ? (
        <div className="space-y-2 rounded border border-red-300 p-3">
          <p>本当にキャンセルしますか？</p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => change("CANCELED")}
              disabled={pending}
              className="rounded bg-red-600 px-4 py-2 text-white disabled:opacity-40"
            >
              キャンセルする
            </button>
            <button
              type="button"
              onClick={() => setConfirming(false)}
              disabled={pending}
              className="rounded border px-4 py-2 disabled:opacity-40"
            >
              やめる
            </button>
          </div>
        </div>
      ) : (
        <div className="flex gap-2">
          {next.map((to) =>
            to === "CANCELED" ? (
              <button
                key={to}
                type="button"
                onClick={() => setConfirming(true)}
                disabled={pending}
                className="rounded border px-4 py-2 disabled:opacity-40"
              >
                {BUTTON_LABELS[to]}
              </button>
            ) : (
              <button
                key={to}
                type="button"
                onClick={() => change(to)}
                disabled={pending}
                className="rounded bg-pink-600 px-4 py-2 text-white disabled:opacity-40"
              >
                {BUTTON_LABELS[to]}
              </button>
            ),
          )}
        </div>
      )}
    </div>
  )
}

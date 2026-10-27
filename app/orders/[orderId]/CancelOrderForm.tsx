"use client"

import { useState, useTransition } from "react"
import { cancelOrderAction } from "../actions"

export function CancelOrderForm({ orderId }: { orderId: string }) {
  const [confirming, setConfirming] = useState(false)
  const [message, setMessage] = useState<string | undefined>()
  const [pending, startTransition] = useTransition()

  function cancel() {
    startTransition(async () => {
      const result = await cancelOrderAction(orderId)
      setMessage(result.message)
      setConfirming(false)
    })
  }

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
              onClick={cancel}
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
        <button type="button" onClick={() => setConfirming(true)} className="rounded border px-4 py-2">
          注文をキャンセル
        </button>
      )}
    </div>
  )
}

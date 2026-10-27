"use client"

import { useState, useTransition } from "react"
import { Button } from "@/components/ui/button"
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
        <p role="alert" className="text-destructive text-sm">
          {message}
        </p>
      )}
      {confirming ? (
        <div className="border-destructive/50 space-y-3 rounded-lg border p-4">
          <p className="text-destructive font-medium">本当にキャンセルしますか？</p>
          <div className="flex gap-2">
            <Button type="button" variant="destructive" onClick={cancel} disabled={pending}>
              キャンセルする
            </Button>
            <Button type="button" variant="outline" onClick={() => setConfirming(false)} disabled={pending}>
              やめる
            </Button>
          </div>
        </div>
      ) : (
        <Button type="button" variant="outline" onClick={() => setConfirming(true)}>
          注文をキャンセル
        </Button>
      )}
    </div>
  )
}

"use client"

import { useState, useTransition } from "react"
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
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
      <div className="flex flex-wrap gap-2">
        {next.map((to) =>
          to === "CANCELED" ? (
            <AlertDialog key={to} open={confirming} onOpenChange={(open) => (pending ? undefined : setConfirming(open))}>
              <AlertDialogTrigger asChild>
                <Button type="button" variant="outline" disabled={pending}>
                  {BUTTON_LABELS[to]}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>本当にキャンセルしますか？</AlertDialogTitle>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel disabled={pending}>やめる</AlertDialogCancel>
                  <Button type="button" variant="destructive" onClick={() => change("CANCELED")} disabled={pending}>
                    キャンセルする
                  </Button>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          ) : (
            <Button key={to} type="button" onClick={() => change(to)} disabled={pending}>
              {BUTTON_LABELS[to]}
            </Button>
          ),
        )}
      </div>
    </div>
  )
}

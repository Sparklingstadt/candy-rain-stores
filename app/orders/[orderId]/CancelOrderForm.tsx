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
import { cancelOrderAction } from "../actions"

export function CancelOrderForm({ orderId }: { orderId: string }) {
  const [open, setOpen] = useState(false)
  const [message, setMessage] = useState<string | undefined>()
  const [pending, startTransition] = useTransition()

  function cancel() {
    startTransition(async () => {
      const result = await cancelOrderAction(orderId)
      setMessage(result.message)
      setOpen(false)
    })
  }

  return (
    <div className="space-y-2">
      {message && (
        <p role="alert" className="text-destructive text-sm">
          {message}
        </p>
      )}
      <AlertDialog open={open} onOpenChange={(next) => (pending ? undefined : setOpen(next))}>
        <AlertDialogTrigger asChild>
          <Button type="button" variant="outline">
            注文をキャンセル
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>本当にキャンセルしますか？</AlertDialogTitle>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>やめる</AlertDialogCancel>
            <Button type="button" variant="destructive" onClick={cancel} disabled={pending}>
              キャンセルする
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

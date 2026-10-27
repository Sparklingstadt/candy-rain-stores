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
import { Card, CardContent } from "@/components/ui/card"
import { deleteProductAction } from "./actions"

export function DeleteProductForm({ productId }: { productId: string }) {
  const [open, setOpen] = useState(false)
  const [pending, startTransition] = useTransition()

  return (
    <Card className="border-destructive/50">
      <CardContent className="space-y-3">
        <AlertDialog open={open} onOpenChange={(next) => (pending ? undefined : setOpen(next))}>
          <AlertDialogTrigger asChild>
            <Button
              type="button"
              variant="outline"
              className="border-destructive/50 text-destructive hover:text-destructive"
            >
              商品を削除
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>本当に削除しますか？</AlertDialogTitle>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={pending}>やめる</AlertDialogCancel>
              <Button
                type="button"
                variant="destructive"
                disabled={pending}
                onClick={() => startTransition(() => deleteProductAction(productId))}
              >
                削除する
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  )
}

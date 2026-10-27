"use client"

import { useState, useTransition } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { deleteProductAction } from "./actions"

export function DeleteProductForm({ productId }: { productId: string }) {
  const [confirming, setConfirming] = useState(false)
  const [pending, startTransition] = useTransition()

  return (
    <Card className="border-destructive/50">
      <CardContent className="space-y-3">
        {confirming ? (
          <>
            <p className="text-destructive text-sm font-medium">本当に削除しますか？</p>
            <div className="flex gap-3">
              <Button
                type="button"
                variant="destructive"
                disabled={pending}
                onClick={() => startTransition(() => deleteProductAction(productId))}
              >
                削除する
              </Button>
              <Button type="button" variant="outline" disabled={pending} onClick={() => setConfirming(false)}>
                やめる
              </Button>
            </div>
          </>
        ) : (
          <Button
            type="button"
            variant="outline"
            className="border-destructive/50 text-destructive hover:text-destructive"
            onClick={() => setConfirming(true)}
          >
            商品を削除
          </Button>
        )}
      </CardContent>
    </Card>
  )
}

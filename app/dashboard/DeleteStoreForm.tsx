"use client"

import { useActionState, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { deleteStoreAction } from "./actions"

export function DeleteStoreForm({ slug }: { slug: string }) {
  const [state, action, pending] = useActionState(deleteStoreAction, {})
  const [confirm, setConfirm] = useState("")
  const matches = confirm.trim().toLowerCase() === slug

  return (
    <Card className="border-destructive/50">
      <CardHeader>
        <CardTitle>
          <h2 className="text-destructive font-bold">ストアを削除</h2>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form action={action} className="space-y-4">
          <p className="text-muted-foreground text-sm">削除すると元に戻せません。画像もすべて削除されます。</p>
          <div className="grid gap-2">
            <Label htmlFor="delete-store-confirm">確認のためストア ID を入力</Label>
            <Input
              id="delete-store-confirm"
              name="confirmSlug"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              autoComplete="off"
            />
          </div>
          {state.error && (
            <p role="alert" className="text-destructive text-sm">
              {state.error}
            </p>
          )}
          <Button type="submit" variant="destructive" disabled={!matches || pending}>
            削除する
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}

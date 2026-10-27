"use client"

import { useActionState, useEffect, useRef, useState } from "react"
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { deleteStoreAction } from "./actions"

export function DeleteStoreForm({ slug }: { slug: string }) {
  const [state, action, pending] = useActionState(deleteStoreAction, {})
  const [confirm, setConfirm] = useState("")
  const [open, setOpen] = useState(false)
  const formRef = useRef<HTMLFormElement>(null)
  const matches = confirm.trim().toLowerCase() === slug

  // Keep the dialog open while the action runs; close it once it settles so the error shows in the form.
  const wasPending = useRef(false)
  useEffect(() => {
    if (wasPending.current && !pending) setOpen(false)
    wasPending.current = pending
  }, [pending])

  return (
    <Card className="border-destructive/50">
      <CardHeader>
        <CardTitle>
          <h2 className="text-destructive font-bold">ストアを削除</h2>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form ref={formRef} action={action} className="space-y-4">
          <p className="text-muted-foreground text-sm">削除すると元に戻せません。画像もすべて削除されます。</p>
          <div className="grid gap-2">
            <Label htmlFor="delete-store-confirm">確認のためストア ID を入力</Label>
            <Input
              id="delete-store-confirm"
              name="confirmSlug"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              onKeyDown={(e) => {
                // Enter would submit the form directly; route it through the confirmation dialog instead.
                if (e.key !== "Enter") return
                e.preventDefault()
                if (matches && !pending) setOpen(true)
              }}
              autoComplete="off"
            />
          </div>
          {state.error && (
            <p role="alert" className="text-destructive text-sm">
              {state.error}
            </p>
          )}
          <AlertDialog open={open} onOpenChange={(next) => (pending ? undefined : setOpen(next))}>
            <AlertDialogTrigger asChild>
              <Button type="button" variant="destructive" disabled={!matches || pending}>
                削除する
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>ストアを削除</AlertDialogTitle>
                <AlertDialogDescription>削除すると元に戻せません。画像もすべて削除されます。</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={pending}>やめる</AlertDialogCancel>
                <Button type="button" variant="destructive" disabled={pending} onClick={() => formRef.current?.requestSubmit()}>
                  削除する
                </Button>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </form>
      </CardContent>
    </Card>
  )
}

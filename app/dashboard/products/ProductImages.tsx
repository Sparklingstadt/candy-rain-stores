"use client"

import { useActionState, useEffect, useRef, useState, useTransition } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { MAX_IMAGES_PER_PRODUCT } from "@/lib/productValidation"
import { MAX_IMAGE_BYTES } from "@/lib/storeValidation"
import {
  addProductImageAction,
  makeProductImageFirstAction,
  removeProductImageAction,
} from "./actions"

type Image = { id: string; url: string; sortOrder: number }

const TOO_LARGE = "画像は 2MB 以下にしてください"

export function ProductImages({ productId, images }: { productId: string; images: Image[] }) {
  const [state, action, uploading] = useActionState(addProductImageAction.bind(null, productId), {})
  const [busy, startTransition] = useTransition()
  const [sizeError, setSizeError] = useState<string | undefined>()
  const formRef = useRef<HTMLFormElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const full = images.length >= MAX_IMAGES_PER_PRODUCT

  // Clear the chosen file once the upload finishes (success or error) so the same file can be picked again.
  useEffect(() => {
    if (!uploading && inputRef.current) inputRef.current.value = ""
  }, [uploading, state])

  function onChange(input: HTMLInputElement) {
    const file = input.files?.[0]
    if (!file) return
    if (file.size > MAX_IMAGE_BYTES) {
      input.value = ""
      setSizeError(TOO_LARGE)
      return
    }
    setSizeError(undefined)
    formRef.current?.requestSubmit()
  }

  const error = sizeError ?? state.error

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h2 className="text-lg font-bold">画像</h2>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {images.length > 0 && (
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {images.map((image, index) => (
              <li key={image.id} className="space-y-2 text-sm">
                <div className="relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={image.url}
                    alt={`商品画像 ${index + 1}`}
                    className="aspect-square w-full rounded-md border object-cover"
                  />
                  {index === 0 && <Badge className="absolute top-1 left-1">1 枚目</Badge>}
                </div>
                <div className="flex flex-wrap gap-2">
                  {index !== 0 && (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={busy}
                      onClick={() => startTransition(() => makeProductImageFirstAction(productId, image.id))}
                    >
                      1 枚目にする
                    </Button>
                  )}
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="border-destructive/50 text-destructive hover:text-destructive"
                    disabled={busy}
                    onClick={() => startTransition(() => removeProductImageAction(productId, image.id))}
                  >
                    削除
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}

        <form ref={formRef} action={action} className="grid gap-2 text-sm">
          <Label htmlFor="product-image-add">画像を追加</Label>
          <Input
            id="product-image-add"
            ref={inputRef}
            type="file"
            name="image"
            accept="image/png,image/jpeg,image/webp"
            disabled={full || uploading}
            onChange={(e) => onChange(e.currentTarget)}
          />
          {full && <p className="text-muted-foreground">画像は {MAX_IMAGES_PER_PRODUCT} 枚までです</p>}
          {uploading && (
            <p role="status" className="text-muted-foreground">
              アップロード中…
            </p>
          )}
          {error && (
            <p role="alert" className="text-destructive">
              {error}
            </p>
          )}
        </form>
      </CardContent>
    </Card>
  )
}

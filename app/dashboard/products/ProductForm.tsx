"use client"

import { useActionState, useEffect } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  createProductAction,
  updateProductAction,
  type ProductFormState,
} from "./actions"

type Existing = {
  id: string
  name: string
  description: string | null
  price: number
  stock: number
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null
  return (
    <p role="alert" className="text-destructive text-sm">
      {message}
    </p>
  )
}

export function ProductForm({ product }: { product?: Existing }) {
  const editing = product !== undefined
  const [state, action, pending] = useActionState<ProductFormState, FormData>(
    editing ? updateProductAction.bind(null, product.id) : createProductAction,
    {},
  )
  // Each submission returns a new state object, so this fires once per successful save.
  useEffect(() => {
    if (state.saved) toast.success("保存しました")
  }, [state])
  const values = state.values
  const errors = state.errors ?? {}

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h2 className="text-lg font-bold">{editing ? "商品を編集" : "商品を追加"}</h2>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form action={action} className="space-y-4">
          {/* 開いたときの在庫数。注文で在庫が変わっていたら上書きしない */}
          {editing && <input type="hidden" name="stockBase" value={String(product.stock)} />}

          <div className="grid gap-2">
            <Label htmlFor="product-name">商品名</Label>
            <Input
              id="product-name"
              name="name"
              defaultValue={values?.name ?? product?.name ?? ""}
              aria-invalid={errors.name ? true : undefined}
            />
            <FieldError message={errors.name} />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="product-price">価格（円）</Label>
            <Input
              id="product-price"
              name="price"
              type="text"
              inputMode="numeric"
              autoComplete="off"
              defaultValue={values?.price ?? (product ? String(product.price) : "")}
              aria-invalid={errors.price ? true : undefined}
            />
            <FieldError message={errors.price} />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="product-stock">在庫数</Label>
            <Input
              id="product-stock"
              name="stock"
              type="text"
              inputMode="numeric"
              autoComplete="off"
              defaultValue={values?.stock ?? (product ? String(product.stock) : "")}
              aria-invalid={errors.stock ? true : undefined}
            />
            <FieldError message={errors.stock} />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="product-description">説明文</Label>
            <Textarea
              id="product-description"
              name="description"
              rows={5}
              className="min-h-28"
              defaultValue={values?.description ?? product?.description ?? ""}
              aria-invalid={errors.description ? true : undefined}
            />
            <FieldError message={errors.description} />
          </div>

          {state.message && (
            <p role="alert" className="text-destructive text-sm">
              {state.message}
            </p>
          )}

          <Button type="submit" disabled={pending}>
            {editing ? "保存する" : "作成する"}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}

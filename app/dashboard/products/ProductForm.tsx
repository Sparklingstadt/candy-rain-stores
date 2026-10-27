"use client"

import { useActionState } from "react"
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
    <p role="alert" className="mt-1 text-sm text-red-600">
      {message}
    </p>
  )
}

const inputClass = "mt-1 block w-full rounded border px-2 py-1"

export function ProductForm({ product }: { product?: Existing }) {
  const editing = product !== undefined
  const [state, action, pending] = useActionState<ProductFormState, FormData>(
    editing ? updateProductAction.bind(null, product.id) : createProductAction,
    {},
  )
  const values = state.values
  const errors = state.errors ?? {}

  return (
    <form action={action} className="space-y-4 rounded border p-4">
      <h2 className="text-lg font-bold">{editing ? "商品を編集" : "商品を追加"}</h2>
      {/* 開いたときの在庫数。注文で在庫が変わっていたら上書きしない */}
      {editing && <input type="hidden" name="stockBase" value={String(product.stock)} />}

      <label className="block text-sm">
        商品名
        <input name="name" defaultValue={values?.name ?? product?.name ?? ""} className={inputClass} />
        <FieldError message={errors.name} />
      </label>

      <label className="block text-sm">
        価格（円）
        <input
          name="price"
          type="text"
          inputMode="numeric"
          autoComplete="off"
          defaultValue={values?.price ?? (product ? String(product.price) : "")}
          className={inputClass}
        />
        <FieldError message={errors.price} />
      </label>

      <label className="block text-sm">
        在庫数
        <input
          name="stock"
          type="text"
          inputMode="numeric"
          autoComplete="off"
          defaultValue={values?.stock ?? (product ? String(product.stock) : "")}
          className={inputClass}
        />
        <FieldError message={errors.stock} />
      </label>

      <label className="block text-sm">
        説明文
        <textarea
          name="description"
          rows={5}
          defaultValue={values?.description ?? product?.description ?? ""}
          className={inputClass}
        />
        <FieldError message={errors.description} />
      </label>

      {state.message && (
        <p role="alert" className="text-sm text-red-600">
          {state.message}
        </p>
      )}
      {state.saved && (
        <p role="status" className="text-sm text-green-700">
          保存しました
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="rounded bg-pink-600 px-4 py-2 text-white disabled:opacity-50"
      >
        {editing ? "保存する" : "作成する"}
      </button>
    </form>
  )
}

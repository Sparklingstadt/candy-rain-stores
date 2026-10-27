"use client"

import { useActionState, useEffect, useRef, useState, useTransition } from "react"
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
    <section className="space-y-3 rounded border p-4">
      <h2 className="text-lg font-bold">画像</h2>

      {images.length > 0 && (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {images.map((image, index) => (
            <li key={image.id} className="space-y-2 text-sm">
              <div className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={image.url}
                  alt={`商品画像 ${index + 1}`}
                  className="aspect-square w-full rounded object-cover"
                />
                {index === 0 && (
                  <span className="absolute left-1 top-1 rounded bg-pink-600 px-2 py-0.5 text-xs text-white">
                    1 枚目
                  </span>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {index !== 0 && (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => startTransition(() => makeProductImageFirstAction(productId, image.id))}
                    className="rounded border px-2 py-1 disabled:opacity-50"
                  >
                    1 枚目にする
                  </button>
                )}
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => startTransition(() => removeProductImageAction(productId, image.id))}
                  className="rounded border border-red-600 px-2 py-1 text-red-700 disabled:opacity-50"
                >
                  削除
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <form ref={formRef} action={action} className="text-sm">
        <label className="block">
          画像を追加
          <input
            ref={inputRef}
            type="file"
            name="image"
            accept="image/png,image/jpeg,image/webp"
            disabled={full || uploading}
            onChange={(e) => onChange(e.currentTarget)}
            className="mt-1 block w-full rounded border px-2 py-1"
          />
        </label>
        {full && <p className="mt-1 text-gray-600">画像は {MAX_IMAGES_PER_PRODUCT} 枚までです</p>}
        {uploading && (
          <p role="status" className="mt-1 text-gray-600">
            アップロード中…
          </p>
        )}
        {error && (
          <p role="alert" className="mt-1 text-red-600">
            {error}
          </p>
        )}
      </form>
    </section>
  )
}

"use client"

import { MAX_QUANTITY } from "@/lib/orderValidation"
import { removeFromCartAction, setCartQuantityAction } from "./actions"

export function CartLineControls({ itemId, quantity, name }: { itemId: string; quantity: number; name: string }) {
  return (
    <div className="flex items-center gap-3">
      <form action={setCartQuantityAction.bind(null, itemId)}>
        <label>
          <span className="sr-only">{name}の数量</span>
          <select
            name="quantity"
            defaultValue={String(quantity)}
            onChange={(e) => e.currentTarget.form?.requestSubmit()}
            className="rounded border px-2 py-1"
          >
            {Array.from({ length: MAX_QUANTITY }, (_, i) => i + 1).map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>
      </form>
      <form action={removeFromCartAction.bind(null, itemId)}>
        <button type="submit" className="text-red-700 underline">
          削除
        </button>
      </form>
    </div>
  )
}

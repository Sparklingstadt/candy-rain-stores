"use client"

import { useActionState } from "react"
import { PREFECTURES, type ShippingInfo } from "@/lib/orderValidation"
import { placeOrderAction, type CheckoutState } from "./actions"

const inputClass = "mt-1 block w-full rounded border px-2 py-1"

function FieldError({ message }: { message?: string }) {
  if (!message) return null
  return (
    <p role="alert" className="mt-1 text-sm text-red-600">
      {message}
    </p>
  )
}

// cartVersion はこの画面で見せたカートの版。確定時に変わっていたら注文しない
export function CheckoutForm({ initial, cartVersion }: { initial: ShippingInfo; cartVersion: string }) {
  const [state, action, pending] = useActionState<CheckoutState, FormData>(placeOrderAction, {})
  const values = state.values ?? initial
  const errors = state.errors ?? {}

  return (
    <form action={action} className="space-y-4 rounded border p-4">
      <h2 className="text-lg font-bold">お届け先</h2>
      <input type="hidden" name="cartVersion" value={cartVersion} />
      <label className="block text-sm">
        郵便番号
        <input name="postalCode" defaultValue={values.postalCode} autoComplete="postal-code" className={inputClass} />
        <FieldError message={errors.postalCode} />
      </label>
      <label className="block text-sm">
        都道府県
        <select name="prefecture" defaultValue={values.prefecture} className={inputClass}>
          <option value="">選んでください</option>
          {PREFECTURES.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
        <FieldError message={errors.prefecture} />
      </label>
      <label className="block text-sm">
        住所
        <input name="address" defaultValue={values.address} autoComplete="street-address" className={inputClass} />
        <FieldError message={errors.address} />
      </label>
      <label className="block text-sm">
        電話番号
        <input name="phone" type="tel" defaultValue={values.phone} autoComplete="tel" className={inputClass} />
        <FieldError message={errors.phone} />
      </label>
      {state.message && (
        <p role="alert" className="text-sm text-red-600">
          {state.message}
        </p>
      )}
      <button type="submit" disabled={pending} className="rounded border px-4 py-2 disabled:opacity-40">
        {pending ? "送信中…" : "注文を確定する"}
      </button>
    </form>
  )
}

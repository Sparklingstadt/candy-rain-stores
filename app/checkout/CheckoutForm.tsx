"use client"

import { useActionState } from "react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select"
import { PREFECTURES, type ShippingInfo } from "@/lib/orderValidation"
import { placeOrderAction, type CheckoutState } from "./actions"

function FieldError({ message }: { message?: string }) {
  if (!message) return null
  return (
    <p role="alert" className="text-destructive text-sm">
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
    <Card>
      <CardHeader>
        <CardTitle>
          <h2 className="text-lg font-bold">お届け先</h2>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form action={action} className="space-y-4">
          <input type="hidden" name="cartVersion" value={cartVersion} />
          <div className="grid gap-2">
            <Label htmlFor="checkout-postalCode">郵便番号</Label>
            <Input
              id="checkout-postalCode"
              name="postalCode"
              defaultValue={values.postalCode}
              autoComplete="postal-code"
              aria-invalid={errors.postalCode ? true : undefined}
            />
            <FieldError message={errors.postalCode} />
          </div>
          <div className="grid gap-2 [&_[data-slot=native-select-wrapper]]:w-full">
            <Label htmlFor="checkout-prefecture">都道府県</Label>
            <NativeSelect
              id="checkout-prefecture"
              name="prefecture"
              defaultValue={values.prefecture}
              aria-invalid={errors.prefecture ? true : undefined}
            >
              <NativeSelectOption value="">選んでください</NativeSelectOption>
              {PREFECTURES.map((p) => (
                <NativeSelectOption key={p} value={p}>
                  {p}
                </NativeSelectOption>
              ))}
            </NativeSelect>
            <FieldError message={errors.prefecture} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="checkout-address">住所</Label>
            <Input
              id="checkout-address"
              name="address"
              defaultValue={values.address}
              autoComplete="street-address"
              aria-invalid={errors.address ? true : undefined}
            />
            <FieldError message={errors.address} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="checkout-phone">電話番号</Label>
            <Input
              id="checkout-phone"
              name="phone"
              type="tel"
              defaultValue={values.phone}
              autoComplete="tel"
              aria-invalid={errors.phone ? true : undefined}
            />
            <FieldError message={errors.phone} />
          </div>
          {state.message && (
            <p role="alert" className="text-destructive text-sm">
              {state.message}
            </p>
          )}
          <Alert role="note">
            <AlertTitle>注文の確定後はキャンセルできません</AlertTitle>
            <AlertDescription>
              確定した注文は、購入者の方からはキャンセルできません。変更やキャンセルが必要なときは、注文詳細に表示されるストアの連絡先へお問い合わせください。
            </AlertDescription>
          </Alert>
          <Button type="submit" disabled={pending}>
            {pending ? "送信中…" : "注文を確定する"}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}

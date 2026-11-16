"use client"

import { useActionState, useEffect, useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { DEFAULT_THEME_COLOR, MAX_IMAGE_BYTES } from "@/lib/storeValidation"
import {
  createStoreAction,
  updateStoreAction,
  type StoreFormState,
} from "./actions"

type Existing = {
  name: string
  description: string | null
  themeColor: string
  paymentInstructions: string | null
  contactEmail: string | null
  logoUrl: string | null
  headerUrl: string | null
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null
  return (
    <p role="alert" className="text-destructive text-sm">
      {message}
    </p>
  )
}

const TOO_LARGE = "画像は 2MB 以下にしてください"

export function StoreForm({ store }: { store?: Existing }) {
  const editing = store !== undefined
  const [state, action, pending] = useActionState<StoreFormState, FormData>(
    editing ? updateStoreAction : createStoreAction,
    {},
  )
  // Each submission returns a new state object, so this fires once per successful save.
  useEffect(() => {
    if (state.saved) toast.success("保存しました")
  }, [state])
  const values = state.values
  const errors = state.errors ?? {}
  const [fileErrors, setFileErrors] = useState<{ logo?: string; header?: string }>({})

  // Oversized files never reach the server (platform body limits), so reject them here.
  function checkSize(field: "logo" | "header", input: HTMLInputElement) {
    const file = input.files?.[0]
    if (file && file.size > MAX_IMAGE_BYTES) {
      input.value = ""
      setFileErrors((prev) => ({ ...prev, [field]: TOO_LARGE }))
    } else {
      setFileErrors((prev) => ({ ...prev, [field]: undefined }))
    }
  }

  return (
    <Card className="rounded-3xl shadow-none">
      <CardHeader className="border-b pb-6">
        <CardTitle>
          <h2 className="text-lg font-semibold">{editing ? "ストアを編集" : "ストアを作成"}</h2>
        </CardTitle>
        <CardDescription className="leading-7">{editing ? "紹介文や写真で、お店の空気を伝えましょう。" : "まずはお店の名前から。紹介文や画像はあとから整えられます。"}</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={action} className="grid items-start gap-6 md:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor="store-name">ストア名</Label>
            <Input
              id="store-name"
              name="name"
              defaultValue={values?.name ?? store?.name ?? ""}
              aria-invalid={errors.name ? true : undefined}
            />
            <FieldError message={errors.name} />
          </div>

          <div className="grid gap-2 md:col-span-2">
            <Label htmlFor="store-description">説明文</Label>
            <Textarea
              id="store-description"
              name="description"
              rows={4}
              className="min-h-24"
              defaultValue={values?.description ?? store?.description ?? ""}
              aria-invalid={errors.description ? true : undefined}
            />
            <FieldError message={errors.description} />
          </div>

          <div className="grid gap-2 md:col-span-2">
            <Label htmlFor="store-themeColor">テーマカラー</Label>
            <Input
              id="store-themeColor"
              type="color"
              name="themeColor"
              defaultValue={values?.themeColor || store?.themeColor || DEFAULT_THEME_COLOR}
              className="h-10 w-20 cursor-pointer p-1"
              aria-invalid={errors.themeColor ? true : undefined}
            />
            <p className="text-muted-foreground text-xs leading-6">ストアページのアクセントに使う色です。</p>
            <FieldError message={errors.themeColor} />
          </div>

          <div className="grid gap-2 md:col-span-2">
            <Label htmlFor="store-paymentInstructions">お支払い方法の案内</Label>
            <Textarea
              id="store-paymentInstructions"
              name="paymentInstructions"
              rows={4}
              className="min-h-24"
              defaultValue={values?.paymentInstructions ?? store?.paymentInstructions ?? ""}
              aria-invalid={errors.paymentInstructions ? true : undefined}
            />
            <span className="text-muted-foreground block text-sm">
              注文したお客さんに表示されます（1,000 文字まで）
            </span>
            <FieldError message={errors.paymentInstructions} />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="store-contactEmail">連絡先のメールアドレス</Label>
            <Input
              id="store-contactEmail"
              type="email"
              name="contactEmail"
              autoComplete="email"
              defaultValue={values?.contactEmail ?? store?.contactEmail ?? ""}
              aria-invalid={errors.contactEmail ? true : undefined}
            />
            <span className="text-muted-foreground block text-sm">
              注文詳細に表示されます。購入者は自分で注文をキャンセルできないので、変更やキャンセルの連絡はここに届きます
            </span>
            <FieldError message={errors.contactEmail} />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="store-logo">ロゴ画像</Label>
            <Input
              id="store-logo"
              type="file"
              name="logo"
              onChange={(e) => checkSize("logo", e.currentTarget)}
              accept="image/png,image/jpeg,image/webp"
              aria-invalid={fileErrors.logo ?? errors.logo ? true : undefined}
            />
            <p className="text-muted-foreground text-xs">PNG・JPEG・WebP / 2MB 以下</p>
            {store?.logoUrl && (
              <div className="flex flex-wrap items-center gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={store.logoUrl} alt="現在のロゴ" className="h-16 w-16 rounded-md border object-cover" />
                <Label className="font-normal">
                  <Checkbox name="removeLogo" />
                  ロゴを削除
                </Label>
              </div>
            )}
            <FieldError message={fileErrors.logo ?? errors.logo} />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="store-header">ヘッダー画像</Label>
            <Input
              id="store-header"
              type="file"
              name="header"
              onChange={(e) => checkSize("header", e.currentTarget)}
              accept="image/png,image/jpeg,image/webp"
              aria-invalid={fileErrors.header ?? errors.header ? true : undefined}
            />
            <p className="text-muted-foreground text-xs">PNG・JPEG・WebP / 2MB 以下</p>
            {store?.headerUrl && (
              <div className="flex flex-wrap items-center gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={store.headerUrl}
                  alt="現在のヘッダー画像"
                  className="h-16 w-40 rounded-md border object-cover"
                />
                <Label className="font-normal">
                  <Checkbox name="removeHeader" />
                  ヘッダー画像を削除
                </Label>
              </div>
            )}
            <FieldError message={fileErrors.header ?? errors.header} />
          </div>

          {state.message && (
            <p role="alert" className="text-destructive text-sm md:col-span-2">
              {state.message}
            </p>
          )}

          <div className="border-t pt-6 md:col-span-2">
            <Button type="submit" disabled={pending} className="min-h-11 rounded-full px-8">
              {editing ? "保存する" : "作成する"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}

"use client"

import { useActionState, useState, useSyncExternalStore } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
  slug: string
  name: string
  description: string | null
  themeColor: string
  paymentInstructions: string | null
  logoUrl: string | null
  headerUrl: string | null
}

const noopSubscribe = () => () => {}

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
  const origin = useSyncExternalStore(
    noopSubscribe,
    () => window.location.origin,
    () => "",
  )
  const values = state.values
  const [slug, setSlug] = useState(values?.slug ?? "")
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
    <Card>
      <CardHeader>
        <CardTitle>
          <h2 className="text-lg font-bold">{editing ? "ストアを編集" : "ストアを作成"}</h2>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form action={action} className="space-y-4">
          {editing ? (
            <div className="grid gap-2 text-sm">
              <span className="font-medium">ストア ID</span>
              <p className="font-mono">{store.slug}</p>
            </div>
          ) : (
            <div className="grid gap-2">
              <Label htmlFor="store-slug">ストア ID</Label>
              <Input
                id="store-slug"
                name="slug"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                autoComplete="off"
                aria-invalid={errors.slug ? true : undefined}
              />
              <span className="text-muted-foreground block text-sm">
                URL: {origin}/s/{slug}
              </span>
              <span className="text-muted-foreground block text-sm">作成後は変更できません</span>
              <FieldError message={errors.slug} />
            </div>
          )}

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

          <div className="grid gap-2">
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

          <div className="grid gap-2">
            <Label htmlFor="store-themeColor">テーマカラー</Label>
            <Input
              id="store-themeColor"
              type="color"
              name="themeColor"
              defaultValue={values?.themeColor || store?.themeColor || DEFAULT_THEME_COLOR}
              className="h-10 w-20 cursor-pointer p-1"
              aria-invalid={errors.themeColor ? true : undefined}
            />
            <FieldError message={errors.themeColor} />
          </div>

          <div className="grid gap-2">
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
            <Label htmlFor="store-logo">ロゴ画像</Label>
            <Input
              id="store-logo"
              type="file"
              name="logo"
              onChange={(e) => checkSize("logo", e.currentTarget)}
              accept="image/png,image/jpeg,image/webp"
              aria-invalid={fileErrors.logo ?? errors.logo ? true : undefined}
            />
            {store?.logoUrl && (
              <div className="flex items-center gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={store.logoUrl} alt="現在のロゴ" className="h-16 w-16 rounded-md border object-cover" />
                <Label className="font-normal">
                  <input type="checkbox" name="removeLogo" className="accent-primary size-4" />
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
            {store?.headerUrl && (
              <div className="flex items-center gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={store.headerUrl}
                  alt="現在のヘッダー画像"
                  className="h-16 w-40 rounded-md border object-cover"
                />
                <Label className="font-normal">
                  <input type="checkbox" name="removeHeader" className="accent-primary size-4" />
                  ヘッダー画像を削除
                </Label>
              </div>
            )}
            <FieldError message={fileErrors.header ?? errors.header} />
          </div>

          {state.message && (
            <p role="alert" className="text-destructive text-sm">
              {state.message}
            </p>
          )}
          {state.saved && (
            <p role="status" className="text-sm text-green-700 dark:text-green-400">
              保存しました
            </p>
          )}

          <Button
            type="submit"
            disabled={pending}
            className="text-white hover:opacity-90"
            style={{ backgroundColor: store?.themeColor ?? DEFAULT_THEME_COLOR }}
          >
            {editing ? "保存する" : "作成する"}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}

"use client"

import { useActionState, useState, useSyncExternalStore } from "react"
import { DEFAULT_THEME_COLOR } from "@/lib/storeValidation"
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
  logoUrl: string | null
  headerUrl: string | null
}

const noopSubscribe = () => () => {}

function FieldError({ message }: { message?: string }) {
  if (!message) return null
  return (
    <p role="alert" className="mt-1 text-sm text-red-600">
      {message}
    </p>
  )
}

const inputClass = "mt-1 block w-full rounded border px-2 py-1"

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

  return (
    <form action={action} className="space-y-4 rounded border p-4">
      <h2 className="text-lg font-bold">{editing ? "ストアを編集" : "ストアを作成"}</h2>

      {editing ? (
        <div className="text-sm">
          <span className="font-medium">ストア ID</span>
          <p className="font-mono">{store.slug}</p>
        </div>
      ) : (
        <label className="block text-sm">
          ストア ID
          <input
            name="slug"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            autoComplete="off"
            className={inputClass}
          />
          <span className="mt-1 block text-gray-600">
            URL: {origin}/s/{slug}
          </span>
          <span className="block text-gray-600">作成後は変更できません</span>
          <FieldError message={errors.slug} />
        </label>
      )}

      <label className="block text-sm">
        ストア名
        <input
          name="name"
          defaultValue={values?.name ?? store?.name ?? ""}
          className={inputClass}
        />
        <FieldError message={errors.name} />
      </label>

      <label className="block text-sm">
        説明文
        <textarea
          name="description"
          rows={4}
          defaultValue={values?.description ?? store?.description ?? ""}
          className={inputClass}
        />
        <FieldError message={errors.description} />
      </label>

      <label className="block text-sm">
        テーマカラー
        <input
          type="color"
          name="themeColor"
          defaultValue={values?.themeColor || store?.themeColor || DEFAULT_THEME_COLOR}
          className="mt-1 block h-10 w-20"
        />
        <FieldError message={errors.themeColor} />
      </label>

      <div className="text-sm">
        <label className="block">
          ロゴ画像
          <input
            type="file"
            name="logo"
            accept="image/png,image/jpeg,image/webp"
            className={inputClass}
          />
        </label>
        {store?.logoUrl && (
          <div className="mt-2 flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={store.logoUrl} alt="現在のロゴ" className="h-16 w-16 rounded object-cover" />
            <label className="flex items-center gap-1">
              <input type="checkbox" name="removeLogo" />
              ロゴを削除
            </label>
          </div>
        )}
        <FieldError message={errors.logo} />
      </div>

      <div className="text-sm">
        <label className="block">
          ヘッダー画像
          <input
            type="file"
            name="header"
            accept="image/png,image/jpeg,image/webp"
            className={inputClass}
          />
        </label>
        {store?.headerUrl && (
          <div className="mt-2 flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={store.headerUrl}
              alt="現在のヘッダー画像"
              className="h-16 w-40 rounded object-cover"
            />
            <label className="flex items-center gap-1">
              <input type="checkbox" name="removeHeader" />
              ヘッダー画像を削除
            </label>
          </div>
        )}
        <FieldError message={errors.header} />
      </div>

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
        className="rounded px-4 py-2 text-white disabled:opacity-50"
        style={{ backgroundColor: store?.themeColor ?? DEFAULT_THEME_COLOR }}
      >
        {editing ? "保存する" : "作成する"}
      </button>
    </form>
  )
}

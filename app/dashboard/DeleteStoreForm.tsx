"use client"

import { useActionState, useState } from "react"
import { deleteStoreAction } from "./actions"

export function DeleteStoreForm({ slug }: { slug: string }) {
  const [state, action, pending] = useActionState(deleteStoreAction, {})
  const [confirm, setConfirm] = useState("")
  const matches = confirm.trim().toLowerCase() === slug

  return (
    <form action={action} className="space-y-3 rounded border border-red-300 p-4">
      <h2 className="font-bold text-red-700">ストアを削除</h2>
      <p className="text-sm text-gray-600">削除すると元に戻せません。画像もすべて削除されます。</p>
      <label className="block text-sm">
        確認のためストア ID を入力
        <input
          name="confirmSlug"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          autoComplete="off"
          className="mt-1 block w-full rounded border px-2 py-1"
        />
      </label>
      {state.error && (
        <p role="alert" className="text-sm text-red-600">
          {state.error}
        </p>
      )}
      <button
        type="submit"
        disabled={!matches || pending}
        className="rounded bg-red-600 px-4 py-2 text-white disabled:opacity-40"
      >
        削除する
      </button>
    </form>
  )
}

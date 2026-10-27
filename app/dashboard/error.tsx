"use client"

export default function DashboardError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div role="alert" className="space-y-4 p-4">
      <p>エラーが発生しました。時間をおいてもう一度お試しください。</p>
      <button type="button" onClick={reset} className="rounded border px-4 py-2">
        もう一度試す
      </button>
    </div>
  )
}

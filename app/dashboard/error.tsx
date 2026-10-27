"use client"

import { CircleAlertIcon } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"

export default function DashboardError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="mx-auto max-w-2xl space-y-4 p-4">
      <Alert variant="destructive">
        <CircleAlertIcon />
        <AlertDescription>
          <p>エラーが発生しました。時間をおいてもう一度お試しください。</p>
        </AlertDescription>
      </Alert>
      <Button type="button" variant="outline" onClick={reset}>
        もう一度試す
      </Button>
    </div>
  )
}

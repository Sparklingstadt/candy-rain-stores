import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

export default function Loading() {
  return (
    <div className="w-full max-w-3xl space-y-6" aria-busy="true">
      <Card>
        <CardHeader>
          <Skeleton className="h-7 w-48" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-5 w-16" />
          <div className="flex flex-wrap gap-3">
            <Skeleton className="h-9 w-28" />
            <Skeleton className="h-9 w-36" />
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-28" />
        </CardHeader>
        <CardContent className="space-y-4">
          {[0, 1, 2].map((i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-9 w-full" />
            </div>
          ))}
          <Skeleton className="h-28 w-full" />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-20" />
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="size-24" />
          ))}
        </CardContent>
      </Card>
    </div>
  )
}

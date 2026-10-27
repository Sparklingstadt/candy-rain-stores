import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

export default function Loading() {
  return (
    <div className="w-full max-w-3xl space-y-6" aria-busy="true">
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
          <div className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-28 w-full" />
          </div>
          <Skeleton className="h-9 w-24" />
        </CardContent>
      </Card>
      <Skeleton className="h-9 w-32" />
    </div>
  )
}

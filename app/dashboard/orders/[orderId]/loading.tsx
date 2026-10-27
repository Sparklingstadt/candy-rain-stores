import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

function SkeletonCard({ lines }: { lines: number }) {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-6 w-24" />
      </CardHeader>
      <CardContent className="space-y-2">
        {Array.from({ length: lines }, (_, i) => (
          <Skeleton key={i} className="h-5 w-full max-w-64" />
        ))}
      </CardContent>
    </Card>
  )
}

export default function Loading() {
  return (
    <div className="space-y-6" aria-busy="true">
      <div className="space-y-2">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-4 w-40" />
      </div>
      <div className="flex flex-wrap items-start gap-6">
        <div className="flex min-w-0 flex-[999_1_100%] flex-col gap-6 lg:flex-[999_1_480px]">
          <SkeletonCard lines={3} />
          <SkeletonCard lines={2} />
          <SkeletonCard lines={2} />
        </div>
        <div className="w-full min-w-0 lg:w-auto lg:max-w-[360px] lg:flex-[1_1_280px]">
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-24" />
            </CardHeader>
            <CardContent className="space-y-4">
              <Skeleton className="h-6 w-32" />
              <div className="flex flex-wrap gap-2">
                <Skeleton className="h-9 w-32" />
                <Skeleton className="h-9 w-28" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      <Skeleton className="h-9 w-32" />
    </div>
  )
}

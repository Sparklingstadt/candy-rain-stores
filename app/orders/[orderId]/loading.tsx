import { HeaderSkeleton } from "@/app/components/HeaderSkeleton"
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
    <>
      <HeaderSkeleton />
      <main className="mx-auto max-w-2xl space-y-6 p-4" aria-busy="true">
        <Skeleton className="h-8 w-56" />
        <div className="space-y-2">
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-5 w-40" />
        </div>
        <SkeletonCard lines={3} />
        <SkeletonCard lines={3} />
        <SkeletonCard lines={2} />
        <Skeleton className="h-9 w-36" />
      </main>
    </>
  )
}

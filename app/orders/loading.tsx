import { HeaderSkeleton } from "@/app/components/HeaderSkeleton"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

export default function Loading() {
  return (
    <>
      <HeaderSkeleton />
      <main className="mx-auto max-w-2xl space-y-6 p-4" aria-busy="true">
        <Skeleton className="h-8 w-36" />
        <ul className="space-y-3">
          {[0, 1, 2].map((i) => (
            <li key={i}>
              <Card className="gap-0 py-4">
                <CardContent className="space-y-2 px-4">
                  <Skeleton className="h-5 w-40" />
                  <Skeleton className="h-5 w-32" />
                  <Skeleton className="h-4 w-44" />
                  <Skeleton className="h-6 w-48" />
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      </main>
    </>
  )
}

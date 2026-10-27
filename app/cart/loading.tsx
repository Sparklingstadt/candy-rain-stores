import { HeaderSkeleton } from "@/app/components/HeaderSkeleton"
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

export default function Loading() {
  return (
    <>
      <HeaderSkeleton />
      <main className="mx-auto max-w-2xl space-y-6 p-4" aria-busy="true">
        <Skeleton className="h-8 w-28" />
        {[0, 1].map((i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-6 w-40" />
            </CardHeader>
            <CardContent>
              <div className="flex gap-3">
                <Skeleton className="h-16 w-16 shrink-0" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-5 w-3/5" />
                  <Skeleton className="h-5 w-20" />
                  <Skeleton className="h-8 w-40" />
                </div>
              </div>
            </CardContent>
            <CardFooter className="justify-end">
              <Skeleton className="h-5 w-36" />
            </CardFooter>
          </Card>
        ))}
        <Skeleton className="ml-auto h-7 w-32" />
      </main>
    </>
  )
}

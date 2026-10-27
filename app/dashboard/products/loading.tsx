import { Skeleton } from "@/components/ui/skeleton"

export default function Loading() {
  return (
    <div className="space-y-6" aria-busy="true">
      <div className="flex items-center justify-between gap-3 border-b pb-3">
        <Skeleton className="h-7 w-16" />
        <Skeleton className="h-9 w-28" />
      </div>
      <div className="divide-y rounded-lg border">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-3 p-3">
            <Skeleton className="h-12 w-12 shrink-0" />
            <Skeleton className="h-5 flex-1" />
            <Skeleton className="hidden h-5 w-16 sm:block" />
            <Skeleton className="h-8 w-14" />
          </div>
        ))}
      </div>
      <Skeleton className="h-9 w-48" />
    </div>
  )
}

import { Skeleton } from "@/components/ui/skeleton"

// Same height and layout as SiteHeader while the page is loading.
export function HeaderSkeleton() {
  return (
    <div className="flex items-center justify-between gap-3 border-b px-4 py-2" aria-hidden="true">
      <Skeleton className="h-5 w-36" />
      <div className="flex items-center gap-2">
        <Skeleton className="h-8 w-20" />
        <Skeleton className="h-8 w-24" />
      </div>
    </div>
  )
}

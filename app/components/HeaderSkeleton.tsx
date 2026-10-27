import { Skeleton } from "@/components/ui/skeleton"

// Same height and layout as SiteHeader while the page is loading.
export function HeaderSkeleton() {
  return (
    <div className="border-b" aria-hidden="true">
      <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-3 px-4 py-2 sm:px-8">
        <Skeleton className="h-5 w-36" />
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-20" />
          <Skeleton className="h-8 w-24" />
        </div>
      </div>
    </div>
  )
}

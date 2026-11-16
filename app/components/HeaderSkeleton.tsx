import { Skeleton } from "@/components/ui/skeleton"

// Same height and layout as SiteHeader while the page is loading.
export function HeaderSkeleton() {
  return (
    <div className="border-b" aria-hidden="true">
      <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-3 px-5 py-4 sm:px-8">
        <Skeleton className="h-9 w-40" />
        <div className="flex items-center gap-2">
          <Skeleton className="h-10 w-20" />
          <Skeleton className="h-10 w-24" />
        </div>
      </div>
    </div>
  )
}

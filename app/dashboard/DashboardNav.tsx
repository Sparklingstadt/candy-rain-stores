"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

type Props = {
  storeName: string
  slug: string
  isPublished: boolean
  logoUrl: string | null
  onAccent: string
  receivedCount: number
}

const linkClass =
  "focus-visible:ring-ring/50 flex h-10 items-center justify-between gap-2 rounded-lg px-3 text-sm outline-none focus-visible:ring-[3px]"

export function DashboardNav({ storeName, slug, isPublished, logoUrl, onAccent, receivedCount }: Props) {
  const pathname = usePathname()
  const items = [
    { href: "/dashboard", label: "ストアの設定", active: pathname === "/dashboard" },
    { href: "/dashboard/products", label: "商品を管理", active: pathname.startsWith("/dashboard/products") },
    { href: "/dashboard/orders", label: "注文を管理", active: pathname.startsWith("/dashboard/orders") },
  ]

  return (
    <>
      <div className="col-span-2 flex min-w-0 items-center gap-2.5 px-2">
        {logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logoUrl} alt="" className="size-10 shrink-0 rounded-[10px] object-cover" />
        ) : (
          <span
            aria-hidden="true"
            className="flex size-10 shrink-0 items-center justify-center rounded-[10px] bg-(--store-color) font-bold"
            style={{ color: onAccent }}
          >
            {Array.from(storeName)[0]}
          </span>
        )}
        <span className="flex min-w-0 flex-col">
          <span className="text-sm font-semibold wrap-anywhere">{storeName}</span>
          <span className="text-muted-foreground text-xs">{isPublished ? "公開中" : "非公開"}</span>
        </span>
      </div>
      <nav aria-label="ダッシュボード" className="col-span-2 flex flex-wrap gap-1 lg:flex-col lg:gap-0.5">
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            aria-current={item.active ? "page" : undefined}
            className={cn(linkClass, item.active ? "bg-muted font-semibold" : "text-muted-foreground hover:bg-muted/60 hover:text-foreground")}
          >
            {item.label}
            {item.href === "/dashboard/orders" && (
              <Badge
                className="min-w-5 bg-(--store-color) tabular-nums"
                style={{ color: onAccent }}
              >
                <span className="sr-only">（受付 </span>
                {receivedCount}
                <span className="sr-only"> 件）</span>
              </Badge>
            )}
          </Link>
        ))}
        <Link
          href={`/s/${slug}`}
          className={cn(linkClass, "text-muted-foreground hover:bg-muted/60 hover:text-foreground")}
        >
          ストアページを見る
        </Link>
      </nav>
    </>
  )
}

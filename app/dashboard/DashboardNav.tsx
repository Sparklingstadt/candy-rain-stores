"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { ArrowUpRightIcon, HouseIcon, PackageIcon, Settings2Icon, ShoppingBagIcon } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

type Props = {
  storeName: string
  slug: string
  isPublished: boolean
  logoUrl: string | null
  themeColor: string
  onAccent: string
  receivedCount: number
}

const linkClass =
  "focus-visible:ring-ring flex min-h-11 shrink-0 items-center gap-2.5 rounded-xl px-3.5 py-3 text-xs font-medium whitespace-nowrap outline-none transition-colors focus-visible:ring-2 lg:text-sm"

export function DashboardNav({ storeName, slug, isPublished, logoUrl, themeColor, onAccent, receivedCount }: Props) {
  const pathname = usePathname()
  const items = [
    { href: "/dashboard", label: "お店のホーム", icon: HouseIcon, active: pathname === "/dashboard" },
    { href: "/dashboard/products", label: "商品を管理", icon: PackageIcon, active: pathname.startsWith("/dashboard/products") },
    { href: "/dashboard/orders", label: "注文を管理", icon: ShoppingBagIcon, active: pathname.startsWith("/dashboard/orders") },
    { href: "/dashboard#store-settings", label: "ストアの設定", icon: Settings2Icon, active: false },
  ]

  return (
    <>
      <p className="text-muted-foreground mb-3 px-2 text-[10px] font-medium tracking-[0.18em]">MY LITTLE STORE</p>
      <Link href={`/s/${slug}`} className="focus-visible:ring-ring mb-5 flex min-w-0 items-center gap-3 rounded-xl px-2 py-1 outline-none focus-visible:ring-2 lg:mb-7">
        {logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logoUrl} alt="" className="size-11 shrink-0 rounded-2xl object-cover" />
        ) : (
          <span
            aria-hidden="true"
            className="flex size-11 shrink-0 items-center justify-center rounded-2xl font-semibold"
            style={{ backgroundColor: themeColor, color: onAccent }}
          >
            {Array.from(storeName)[0]}
          </span>
        )}
        <span className="flex min-w-0 flex-col gap-1">
          <span className="text-sm font-semibold wrap-anywhere">{storeName}</span>
          <span className="text-muted-foreground text-xs">{isPublished ? "公開中" : "非公開"}</span>
        </span>
      </Link>
      <nav aria-label="ダッシュボード" className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1 lg:mx-0 lg:flex-col lg:overflow-visible lg:px-0">
        {items.map(({ icon: Icon, ...item }) => (
          <Link
            key={item.href}
            href={item.href}
            aria-current={item.active ? "page" : undefined}
            className={cn(linkClass, item.active ? "bg-secondary text-primary" : "text-muted-foreground hover:bg-accent hover:text-accent-foreground")}
          >
            <Icon aria-hidden="true" className="size-4 shrink-0" />
            {item.label}
            {item.href === "/dashboard/orders" && (
              <Badge className="ml-auto min-w-5 tabular-nums" style={{ backgroundColor: themeColor, color: onAccent }}>
                <span className="sr-only">（受付 </span>
                {receivedCount}
                <span className="sr-only"> 件）</span>
              </Badge>
            )}
          </Link>
        ))}
      </nav>
      <Link href={`/s/${slug}`} className="text-muted-foreground hover:text-primary focus-visible:ring-ring mt-4 inline-flex min-h-11 items-center gap-2 rounded-lg px-3 text-xs outline-none focus-visible:ring-2 lg:mt-6">
        ストアページを見る<ArrowUpRightIcon aria-hidden="true" className="size-3.5" />
      </Link>
    </>
  )
}

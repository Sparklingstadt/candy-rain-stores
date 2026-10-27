import type { ReactNode } from "react"
import Link from "next/link"
import { ArrowUpRightIcon, HouseIcon, LeafIcon, PackageIcon, Settings2Icon, ShoppingBagIcon } from "lucide-react"
import { cn } from "@/lib/utils"

export type DashboardShellProps = {
  children: ReactNode
  title: string
  description?: string
  storeName?: string
  storeHref?: string
  active: "home" | "products" | "orders"
  headerAction?: ReactNode
  accountAction?: ReactNode
  navigationLinks?: {
    home?: string
    products?: string
    orders?: string
    settings?: string
  }
}

export function DashboardShell({
  children,
  title,
  description,
  storeName,
  storeHref,
  active,
  headerAction,
  accountAction,
  navigationLinks,
}: DashboardShellProps) {
  const navigation = [
    { key: "home", label: "お店のホーム", href: navigationLinks?.home ?? "/dashboard", icon: HouseIcon },
    { key: "products", label: "商品", href: navigationLinks?.products ?? "/dashboard/products", icon: PackageIcon },
    { key: "orders", label: "注文", href: navigationLinks?.orders ?? "/dashboard/orders", icon: ShoppingBagIcon },
    { key: "settings", label: "ストア設定", href: navigationLinks?.settings ?? "/dashboard#store-settings", icon: Settings2Icon },
  ]

  return (
    <div className="bg-background min-h-svh">
      <header className="bg-card/80 border-b">
        <div className="mx-auto flex min-h-20 max-w-7xl flex-wrap items-center justify-between gap-3 px-5 py-4 sm:px-8">
          <Link href={navigationLinks?.home ?? "/dashboard"} className="focus-visible:ring-ring inline-flex items-center gap-3 rounded-xl outline-none focus-visible:ring-2">
            <span className="bg-secondary text-primary grid size-10 place-items-center rounded-2xl">
              <LeafIcon aria-hidden="true" className="size-5" />
            </span>
            <span className="font-semibold tracking-tight">Candy Rain <span className="text-muted-foreground font-normal">Stores</span></span>
          </Link>
          <div className="flex items-center gap-3">
            <span className="text-muted-foreground hidden text-xs sm:block">あなたのお店のアトリエ</span>
            {accountAction}
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl lg:grid lg:grid-cols-[220px_minmax(0,1fr)]">
        <aside className="border-b px-5 py-5 sm:px-8 lg:min-h-[calc(100svh-5rem)] lg:border-r lg:border-b-0 lg:px-5 lg:py-9">
          <div className="mb-4 min-w-0 lg:mb-7 lg:px-3">
            <p className="text-muted-foreground mb-2 text-[10px] font-medium tracking-[0.18em]">MY LITTLE STORE</p>
            <p className="truncate text-sm font-semibold">{storeName ?? "あなたのお店"}</p>
          </div>
          <nav aria-label="ストア管理" className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1 lg:mx-0 lg:flex-col lg:overflow-visible lg:px-0">
            {navigation.map(({ key, label, href, icon: Icon }) => (
              <Link
                key={key}
                href={href}
                aria-current={key === active ? "page" : undefined}
                className={cn(
                  "focus-visible:ring-ring flex min-h-11 shrink-0 items-center gap-2.5 rounded-xl px-3.5 py-3 text-xs font-medium whitespace-nowrap outline-none transition-colors focus-visible:ring-2 lg:text-sm",
                  key === active ? "bg-secondary text-primary" : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                )}
              >
                <Icon aria-hidden="true" className="size-4" />
                {label}
              </Link>
            ))}
          </nav>
          {storeHref && (
            <Link href={storeHref} className="text-muted-foreground hover:text-primary focus-visible:ring-ring mt-4 inline-flex min-h-11 items-center gap-2 rounded-lg px-3 text-xs outline-none focus-visible:ring-2 lg:mt-6">
              公開ストアを見る
              <ArrowUpRightIcon aria-hidden="true" className="size-3.5" />
            </Link>
          )}
          <p className="text-muted-foreground mt-12 hidden px-3 text-xs leading-7 lg:block">小さなお店を、<br />あなたのペースで。</p>
        </aside>

        <main className="min-w-0 px-5 py-8 sm:px-8 lg:px-10 lg:py-10">
          <header className="mb-8 flex flex-wrap items-end justify-between gap-5">
            <div className="min-w-0">
              <p className="text-primary mb-3 text-[10px] font-semibold tracking-[0.2em]">YOUR STORE, YOUR PACE.</p>
              <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h1>
              {description && <p className="text-muted-foreground mt-3 max-w-xl text-sm leading-7">{description}</p>}
            </div>
            {headerAction}
          </header>
          <div className="space-y-7">{children}</div>
        </main>
      </div>
    </div>
  )
}

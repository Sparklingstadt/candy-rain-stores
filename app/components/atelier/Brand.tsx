import Link from "next/link"
import { SproutIcon } from "lucide-react"
import { cn } from "@/lib/utils"

export function Brand({ className, href = "/stores" }: { className?: string; href?: string }) {
  return (
    <Link href={href} aria-label={href === "/stores" ? "Candy Rain Stores ストア一覧" : "Candy Rain Stores ホーム"} className={cn("inline-flex items-center gap-2.5", className)}>
      <span className="bg-secondary text-primary flex size-9 items-center justify-center rounded-[14px]"><SproutIcon className="size-5" aria-hidden /></span>
      <span className="text-[17px] font-semibold tracking-tight">candy rain <span className="text-muted-foreground text-sm font-normal">stores</span></span>
    </Link>
  )
}

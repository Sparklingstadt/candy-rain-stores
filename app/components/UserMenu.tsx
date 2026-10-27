"use client"

import Link from "next/link"
import { signOut } from "next-auth/react"
import { Avatar } from "@/app/components/Avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export function UserMenu({ name, email, image }: { name: string; email: string; image: string | null }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label="アカウントメニュー"
          className="focus-visible:ring-ring/50 ml-1 rounded-full outline-none focus-visible:ring-[3px]"
        >
          <Avatar src={image} />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-56">
        <DropdownMenuLabel className="max-w-72">
          {name && <div className="truncate">{name}</div>}
          <div className={name ? "text-muted-foreground truncate text-xs font-normal" : "truncate"}>{email}</div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/new">新着商品</Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/following">フォロー</Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/orders">購入履歴</Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/dashboard">ダッシュボード</Link>
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => signOut({ redirectTo: "/api/signout-redirect" })}>
          ログアウト
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

import type { Metadata } from "next"
import Link from "next/link"
import { Brand } from "@/app/components/atelier/Brand"

export const metadata: Metadata = {
  title: "Soft Atelier デザインプレビュー | Candy Rain Stores",
  robots: { index: false, follow: false },
}

export default function PreviewLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <div className="bg-primary px-5 py-2 text-center text-[11px] leading-5 text-primary-foreground">デザインプレビュー — 商品・価格・注文は架空のサンプルです。購入・保存はできません。</div>
      <header className="border-b bg-card/80">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-5 py-4 sm:px-8 lg:px-12">
          <Brand />
          <nav aria-label="プレビューの画面" className="flex flex-wrap gap-5 text-xs text-muted-foreground sm:text-sm">
            <Link href="/preview/soft-atelier" className="py-2 hover:text-primary">公開ストア</Link>
            <Link href="/preview/soft-atelier/dashboard" className="py-2 hover:text-primary">管理画面</Link>
            <Link href="/" className="py-2 hover:text-primary">サービスの入口 ↗</Link>
          </nav>
        </div>
      </header>
      {children}
    </>
  )
}

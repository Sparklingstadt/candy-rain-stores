import type { Metadata } from "next"
import { SiteHeader } from "@/app/components/SiteHeader"

export const metadata: Metadata = { title: "新着商品" }

export default function Page() {
  return (
    <>
      <SiteHeader path="/new" />
      <main className="mx-auto max-w-[1440px] space-y-3 p-4 sm:px-8">
        <h1 className="text-2xl font-bold">新着商品</h1>
        <p className="text-muted-foreground">準備中です</p>
      </main>
    </>
  )
}

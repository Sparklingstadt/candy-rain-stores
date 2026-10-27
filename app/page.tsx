import Link from "next/link"
import Image from "next/image"
import { redirect } from "next/navigation"
import { ArrowDownIcon, ArrowUpRightIcon, PackageIcon, PaintbrushIcon, StoreIcon } from "lucide-react"
import { candyRainIdProviderId, signIn } from "@/auth"
import { Button } from "@/components/ui/button"
import { getSub } from "@/lib/session"
import { Brand } from "@/app/components/atelier/Brand"

export default async function Page() {
  if (await getSub()) redirect("/dashboard")
  const handleSignIn = async () => {
    "use server"
    await signIn(candyRainIdProviderId, { redirectTo: "/dashboard" })
  }
  return (
    <div className="min-h-svh">
      <header className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-5 py-6 sm:px-8 lg:px-12">
        <Brand />
        <nav className="flex items-center gap-6 text-sm" aria-label="メインメニュー">
          <a href="#how-it-works" className="text-muted-foreground hidden hover:text-primary sm:block">お店ができるまで</a>
          <Button asChild variant="outline" size="sm"><a href="#start">お店をはじめる <ArrowUpRightIcon aria-hidden /></a></Button>
        </nav>
      </header>
      <main>
        <section id="start" className="mx-auto grid max-w-7xl items-center gap-10 px-5 pb-16 pt-9 sm:px-8 lg:grid-cols-[1fr_1.05fr] lg:gap-16 lg:px-12 lg:pb-24 lg:pt-14">
          <div className="max-w-xl">
            <p className="text-primary mb-6 text-[11px] font-semibold tracking-[.22em]">LITTLE THINGS, LOVELY STORES.</p>
            <h1 className="text-[clamp(1.6rem,7.3vw,2.25rem)] leading-[1.65] font-medium tracking-tight sm:text-5xl">あなたの「好き」が、<br />誰かのときめきに。</h1>
            <p className="text-muted-foreground mt-6 max-w-md text-sm leading-8 sm:text-base">手づくりのもの。見つけた素敵なもの。<br />大切に選んだ品々を、あなたらしいお店に。<br />Candy Rain Storesで、小さな一歩をはじめましょう。</p>
            <form action={handleSignIn} className="mt-8"><Button type="submit" size="lg" className="h-13 px-7">Candy Rain ID でログイン <ArrowUpRightIcon aria-hidden /></Button></form>
            <p className="text-muted-foreground mt-3 text-xs">Candy Rain IDを使って、お店を開設できます。</p>
            <Link href="/preview/soft-atelier" className="text-primary mt-7 inline-flex items-center gap-3 border-b border-primary/30 pb-1 text-sm">サンプルのお店を見てみる <ArrowUpRightIcon className="size-4" aria-hidden /></Link>
          </div>
          <div className="relative px-3 pb-5 sm:px-5">
            <div className="bg-secondary absolute inset-x-0 bottom-0 top-12 rounded-[44%_44%_2rem_2rem]" aria-hidden />
            <div className="relative overflow-hidden rounded-[40%_40%_1.5rem_1.5rem] border-8 border-card shadow-[0_20px_60px_-40px_#713448]">
              <Image src="/demo/nature-wood/03-vase-oak.jpg" alt="木の一輪挿しと穏やかな自然光。サンプル商品のイメージ" width={1024} height={1024} priority className="aspect-square w-full object-cover" />
            </div>
            <div className="bg-card absolute -bottom-3 left-0 flex items-center gap-3 rounded-2xl border px-4 py-3 shadow-sm sm:-left-4">
              <Image src="/demo/nature-wood/01-mug-oak.jpg" alt="木製マグのサンプル" width={56} height={56} className="rounded-xl" />
              <div><p className="text-muted-foreground text-[10px] tracking-widest">A SMALL STORE, A NEW STORY</p><p className="mt-1 text-sm">好きなものを、少しずつ。</p></div>
            </div>
          </div>
        </section>
        <section id="how-it-works" className="border-y bg-card/70">
          <div className="mx-auto max-w-7xl px-5 py-16 sm:px-8 lg:px-12">
            <div className="mb-9 flex items-end justify-between gap-4"><div><p className="text-primary mb-3 text-[10px] font-semibold tracking-[.2em]">YOUR STORE, YOUR PACE.</p><h2 className="text-2xl font-medium">お店づくりは、ひとつずつ。</h2></div><ArrowDownIcon className="text-primary size-5" aria-hidden /></div>
            <div className="grid gap-7 md:grid-cols-3">
              {[
                { icon: StoreIcon, title: "お店に名前をつける", body: "店名と紹介文を添えて、あなたのお店の入口をつくります。" },
                { icon: PaintbrushIcon, title: "あなたらしく整える", body: "写真やテーマカラーで、好きな空気をお店にまとわせます。" },
                { icon: PackageIcon, title: "商品を並べて、公開する", body: "商品の写真・価格・在庫を登録。準備ができたら、お客さんを迎えましょう。" },
              ].map((step, index) => (
                <article key={step.title} className="rounded-3xl bg-background p-7"><div className="mb-6 flex items-center justify-between"><step.icon className="text-primary size-6" aria-hidden /><span className="text-primary/50 font-serif text-2xl">0{index + 1}</span></div><h3 className="mb-3 font-semibold">{step.title}</h3><p className="text-muted-foreground text-sm leading-7">{step.body}</p></article>
              ))}
            </div>
            <p className="text-muted-foreground mt-8 text-xs leading-6">注文のお支払いは、各ストアが案内する方法で行います。</p>
          </div>
        </section>
      </main>
      <footer className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-5 py-8 text-xs text-muted-foreground sm:px-8 lg:px-12"><span>Candy Rain Stores</span><span>好きがつながる、小さなお店。</span></footer>
    </div>
  )
}

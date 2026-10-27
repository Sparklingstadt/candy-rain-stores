import type { CSSProperties } from "react"
import { ArrowUpRightIcon, Flower2Icon, SproutIcon } from "lucide-react"
import { ProductGrid } from "@/app/s/[slug]/ProductGrid"

export type StorefrontStore = {
  name: string
  description: string | null
  themeColor: string
  logoUrl: string | null
  headerUrl: string | null
}

export type StorefrontProduct = {
  id: string
  name: string
  price: number
  stock: number
  isPublished: boolean
  images: { id: string; url: string }[]
  href: string
}

export type StorefrontProps = { store: StorefrontStore; products: StorefrontProduct[] }

export function Storefront({ store, products }: StorefrontProps) {
  const heroProduct = products.find((product) => product.images.length > 0)
  const heroImage = store.headerUrl ?? heroProduct?.images[0]?.url
  const heroImageAlt = store.headerUrl ? `${store.name}のイメージ` : heroProduct?.name ?? ""

  return (
    <div className="bg-[#fffaf6] text-[#4b3439]" style={{ "--store-color": store.themeColor } as CSSProperties}>
      <main className="mx-auto max-w-[1280px] px-5 pb-20 sm:px-8 lg:px-12">
        <header className="flex flex-wrap items-center justify-between gap-x-6 gap-y-5 py-7 sm:py-9 lg:py-11">
          <div className="flex min-w-0 items-center gap-3.5 sm:gap-4">
            {store.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={store.logoUrl} alt="" width={56} height={56} className="size-11 shrink-0 rounded-2xl object-cover sm:size-14" />
            ) : (
              <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-[#f3dce1]/70 sm:size-14">
                <Flower2Icon aria-hidden="true" className="size-6 text-[#a53962]" strokeWidth={1.25} />
              </span>
            )}
            <div className="min-w-0">
              <h1 className="text-xl leading-snug font-semibold tracking-[.04em] break-words sm:text-2xl">{store.name}</h1>
              <p className="mt-1.5 text-[9px] tracking-[.22em] text-[#79656a] sm:text-[10px]">A LITTLE STORE, FILLED WITH LOVE</p>
            </div>
          </div>
          <nav aria-label="ストア内メニュー" className="flex items-center gap-6 pl-0.5 text-xs text-[#786168] sm:gap-8 sm:text-sm">
            <a href="#products" className="rounded-sm py-2 underline-offset-4 transition-colors hover:text-[#a53962] hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#a53962]">商品一覧</a>
            <a href="#about" className="rounded-sm py-2 underline-offset-4 transition-colors hover:text-[#a53962] hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#a53962]">お店について</a>
          </nav>
        </header>

        <section aria-labelledby="store-welcome" className="relative grid overflow-hidden rounded-[1.75rem] bg-[#f3dce1] md:min-h-[460px] md:grid-cols-[1fr_48%] lg:min-h-[500px] lg:rounded-[2.25rem]" style={{ backgroundColor: "color-mix(in srgb, var(--store-color) 13%, #fffaf6)" }}>
          <div className="relative z-10 flex flex-col items-start justify-center px-7 py-10 sm:px-10 sm:py-12 lg:pr-10 lg:pl-14">
            <p className="flex items-center gap-3 text-[9px] tracking-[.2em] text-[#875f6c] sm:text-[10px]"><span aria-hidden="true" className="h-px w-7 bg-[#ba8798]" />LITTLE THINGS, LOVELY DAYS</p>
            <h2 id="store-welcome" className="mt-7 font-serif text-[clamp(1.5rem,6.5vw,2rem)] sm:text-[clamp(1.5rem,3.4vw,3.1rem)] leading-[1.65] font-medium tracking-[.03em]">日々に、<br />小さなときめきを。</h2>
            <p className="mt-5 max-w-sm line-clamp-3 text-sm leading-8 whitespace-pre-line text-[#765d65]">あなたのお気に入りを、<br />ゆっくり見つけてください。</p>
            <a href="#products" className="mt-7 inline-flex min-h-12 items-center justify-center gap-8 rounded-full bg-[#a53962] px-7 text-sm font-medium text-white transition-colors hover:bg-[#8e2e53] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#a53962] sm:mt-8">商品をみる<ArrowUpRightIcon aria-hidden="true" className="size-4" /></a>
          </div>
          <div className="relative flex min-h-72 items-end justify-center px-7 pt-2 pb-7 sm:min-h-80 sm:px-10 sm:pb-10 md:p-7 md:pt-12 lg:p-9 lg:pt-14">
            <span aria-hidden="true" className="absolute top-5 right-5 hidden text-[9px] tracking-[.18em] text-[#875f6c] [writing-mode:vertical-rl] lg:block">MADE FOR SMALL MOMENTS</span>
            {heroImage ? (
              <div className="relative aspect-[1/1.02] w-full max-w-[430px] overflow-hidden rounded-t-[48%] rounded-b-[1.25rem] bg-[#fffaf6]/65">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={heroImage} alt={heroImageAlt} width={1024} height={1024} fetchPriority="high" className="h-full w-full object-cover" />
              </div>
            ) : (
              <div className="relative flex aspect-square w-full max-w-[380px] items-center justify-center overflow-hidden rounded-t-[48%] rounded-b-[1.25rem] bg-[#fffaf6]/55" aria-hidden="true">
                <div className="absolute bottom-0 size-60 translate-y-1/2 rounded-full bg-[#e5ccd4]" />
                <SproutIcon className="relative size-28 text-[#b98f9b] sm:size-36" strokeWidth={.6} />
              </div>
            )}
          </div>
        </section>

        <section id="products" aria-labelledby="products-title" className="scroll-mt-24 pt-13 sm:pt-16 lg:pt-20">
          <div className="mb-7 flex items-end justify-between gap-4 sm:mb-9">
            <div><p className="text-[10px] tracking-[.2em] text-[#79656a]">OUR COLLECTION</p><h2 id="products-title" className="mt-2.5 font-serif text-2xl font-medium tracking-[.05em] sm:text-[1.75rem]">お店の商品</h2></div>
            <p className="pb-1 text-[10px] tracking-[.14em] text-[#876b74] sm:text-xs">{products.length} ITEMS</p>
          </div>
          <ProductGrid products={products} />
        </section>

        <section id="about" aria-labelledby="about-title" className="mt-16 scroll-mt-24 rounded-[1.75rem] border border-[#eaded9] bg-white/40 px-6 py-10 sm:mt-20 sm:px-10 sm:py-12 lg:mt-24 lg:px-14">
          <div className="grid gap-7 md:grid-cols-[.75fr_1.25fr] md:gap-14">
            <div><p className="text-[10px] tracking-[.2em] text-[#79656a]">ABOUT OUR STORE</p><h2 id="about-title" className="mt-3 font-serif text-2xl leading-relaxed font-medium break-words">{store.name}について</h2></div>
            <div><p className="text-sm leading-8 whitespace-pre-line break-words text-[#765d65]">{store.description || `${store.name}へようこそ。商品一覧から、気になるアイテムをゆっくりご覧ください。`}</p><a href="#products" className="mt-6 inline-flex items-center gap-3 rounded-sm py-2 text-sm text-[#a53962] underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#a53962]">商品一覧へ<ArrowUpRightIcon aria-hidden="true" className="size-3.5" /></a></div>
          </div>
        </section>
      </main>
      <footer className="border-t border-[#eaded9]"><div className="mx-auto flex max-w-[1280px] flex-col gap-3 px-5 py-7 text-xs text-[#79656a] sm:flex-row sm:items-center sm:justify-between sm:px-8 lg:px-12"><p className="font-medium break-words text-[#6d515d]">{store.name}</p><p className="text-[10px] tracking-[.08em]">Powered by <span className="font-medium">Candy Rain Stores</span></p></div></footer>
    </div>
  )
}

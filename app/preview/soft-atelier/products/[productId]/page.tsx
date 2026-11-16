import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeftIcon, LeafIcon } from "lucide-react"
import { ProductGallery } from "@/app/s/[slug]/products/[productId]/ProductGallery"
import { sampleProducts } from "../../data"
import { formatPrice } from "@/lib/formatPrice"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

export default async function SampleProductPage({ params }: { params: Promise<{ productId: string }> }) {
  const { productId } = await params
  const product = sampleProducts.find((item) => item.id === productId)
  if (!product) notFound()
  return (
    <main className="mx-auto max-w-7xl px-5 pb-16 sm:px-8 lg:px-12">
      <Link href="/preview/soft-atelier" className="text-muted-foreground my-7 inline-flex min-h-11 items-center gap-2 text-sm hover:text-primary"><ArrowLeftIcon className="size-4" aria-hidden />よはく商店に戻る</Link>
      <div className="grid gap-9 md:grid-cols-[1.15fr_1fr] lg:gap-16">
        <ProductGallery name={product.name} images={product.images} />
        <div className="min-w-0 py-5">
          <p className="text-primary text-xs tracking-widest">よはく商店 / NATURAL WOOD COLLECTION</p>
          <h1 className="mt-5 font-serif text-3xl leading-relaxed">{product.name}</h1>
          <p className="mt-6 text-3xl">{formatPrice(product.price)}</p>
          <div className="mt-4">{product.stock ? <span className="text-muted-foreground text-sm">在庫 {product.stock} 点（サンプル）</span> : <Badge variant="secondary">売り切れ</Badge>}</div>
          <p className="text-muted-foreground mt-8 text-sm leading-8">{product.description}</p>
          <div className="mt-8 rounded-2xl border bg-card p-5"><p className="text-sm font-medium">3つの木目を見比べる</p><p className="text-muted-foreground mt-2 text-sm leading-7">画像は左からオーク、ウォールナット、チェリーです。写真を選んだり拡大したりして、素材の雰囲気をご覧ください。</p></div>
          <Button className="mt-7 w-full" size="lg" disabled>サンプルのため購入できません</Button>
          <p className="text-muted-foreground mt-4 flex items-start gap-2 text-xs leading-6"><LeafIcon className="mt-1 size-4 shrink-0" aria-hidden />AIで制作した商品イメージです。表示価格・在庫はプレビュー用です。</p>
        </div>
      </div>
    </main>
  )
}

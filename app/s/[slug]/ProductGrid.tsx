import Link from "next/link"
import { ArrowUpRightIcon, ImageIcon, PackageOpenIcon } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { formatPrice } from "@/lib/formatPrice"
import type { StorefrontProduct } from "@/app/components/atelier/Storefront"

export function ProductGrid({ products, filtered = false }: { products: StorefrontProduct[]; filtered?: boolean }) {
  if (products.length === 0) {
    return (
      <div className="rounded-[1.75rem] border border-dashed border-[#dfd2ce] bg-white/40 px-6 py-16 text-center">
        <PackageOpenIcon aria-hidden="true" className="mx-auto mb-5 size-8 text-[#ae8a8e]" strokeWidth={1.2} />
        <p className="font-medium text-[#4b3439]">{filtered ? "該当する商品はありません" : "商品はまだありません"}</p>
        <p className="mt-2 text-sm leading-7 text-[#7a6669]">{filtered ? "別の条件で商品をご覧ください。" : "新しい商品が並ぶまで、もう少しお待ちください。"}</p>
      </div>
    )
  }
  return (
    <ul className="grid grid-cols-2 gap-x-4 gap-y-9 sm:gap-x-6 sm:gap-y-12 lg:grid-cols-3 lg:gap-x-8">
      {products.map((product) => {
        const image = product.images[0]
        return (
          <li key={product.id} className="min-w-0">
            <Link
              href={product.href}
              className="group block rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-[#a53962] focus-visible:ring-offset-4 focus-visible:ring-offset-[#fffaf6]"
            >
              <div className="relative aspect-square overflow-hidden rounded-2xl bg-[#eee6df] sm:rounded-[1.4rem]">
                {image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={image.url} alt="" width={1024} height={1024} loading="lazy" className="h-full w-full object-cover transition-transform duration-500 motion-safe:group-hover:scale-[1.035]" />
                ) : (
                  <div className="flex h-full flex-col items-center justify-center gap-3 text-[#79656a]">
                    <ImageIcon aria-hidden="true" className="size-8" strokeWidth={1.1} />
                    <span className="text-xs">画像準備中</span>
                  </div>
                )}
                <div className="absolute top-3 left-3 flex flex-wrap gap-1.5 sm:top-4 sm:left-4">
                  {!product.isPublished && <Badge className="border-0 bg-[#fffaf6]/95 px-2.5 py-1 text-[#66565b]">非公開</Badge>}
                  {product.stock === 0 && <Badge className="border-0 bg-[#fffaf6]/95 px-2.5 py-1 text-[#874c5f]">売り切れ</Badge>}
                </div>
                <span className="absolute right-4 bottom-4 hidden size-10 items-center justify-center rounded-full bg-[#fffaf6]/95 text-[#a53962] transition-transform duration-300 motion-safe:group-hover:-translate-y-1 sm:flex">
                  <ArrowUpRightIcon aria-hidden="true" className="size-4" />
                </span>
              </div>
              <div className="px-1 pt-4 sm:pt-5">
                <h3 className="text-sm leading-6 font-medium break-words text-[#4b3439] sm:text-base">{product.name}</h3>
                <p className="mt-1.5 text-sm tracking-wide text-[#7a6669] sm:text-base">{formatPrice(product.price)}</p>
              </div>
            </Link>
          </li>
        )
      })}
    </ul>
  )
}

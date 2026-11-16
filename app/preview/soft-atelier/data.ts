import type { StorefrontProduct, StorefrontStore } from "@/app/components/atelier/Storefront"

export const sampleStore: StorefrontStore = {
  name: "よはく商店",
  description: "手にするたび、ちょっと心がほどける。\n木目のぬくもりと、暮らしに寄り添うものを集めました。\nなんでもない毎日が、少し好きになるお店です。",
  themeColor: "#a53962",
  logoUrl: null,
  headerUrl: "/demo/nature-wood/03-vase-oak.jpg",
}

export const sampleProducts: (StorefrontProduct & { description: string })[] = [
  { id: "01-mug", name: "まいにちの木製マグ", price: 2800, description: "丸い持ち手と、手のひらになじむやさしいかたち。木目の表情を楽しむマグカップのデザインです。" },
  { id: "02-tray", name: "やさしい角の木製トレー", price: 3600, description: "お茶の時間にも、好きな小物の居場所にも。なめらかな縁と木目を大切にしたトレーのデザインです。" },
  { id: "03-vase", name: "木のしずく 一輪挿し", price: 2200, description: "小さな枝やドライフラワーを一輪。ころんとした木のフォルムが、日々の余白をやわらかく彩ります。" },
  { id: "04-clock", name: "木のぬくもり 置き時計", price: 4800, description: "時を刻む姿も、穏やかに。丸みのある木枠とすっきりした文字盤を組み合わせた置き時計です。" },
  { id: "05-planter", name: "緑と暮らす 木製プランター", price: 3200, description: "窓辺の緑に、木のぬくもりを。シンプルな円筒のフォルムで植物を引き立てるプランターのデザインです。" },
].map((product, index) => ({
  ...product,
  stock: index === 4 ? 0 : 8 + index,
  isPublished: true,
  images: ["oak", "walnut", "cherry"].map((material) => ({ id: `${product.id}-${material}`, url: `/demo/nature-wood/${product.id}-${material}.jpg` })),
  href: `/preview/soft-atelier/products/${product.id}`,
}))

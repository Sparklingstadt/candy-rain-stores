import { Storefront } from "@/app/components/atelier/Storefront"
import { sampleProducts, sampleStore } from "./data"

export default function StorePreviewPage() {
  return <Storefront store={sampleStore} products={sampleProducts} />
}

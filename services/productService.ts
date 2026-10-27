import type { Product, ProductImage } from "../generated/prisma/client"
import { Prisma } from "../generated/prisma/client"
import { MAX_PRODUCTS_PER_STORE, type ProductFields } from "../lib/productValidation"
import { getStoreForViewer, type StoreDeps, type StoreView } from "./storeService"

export type ProductImageView = { id: string; url: string; sortOrder: number }
export type ProductView = Product & { images: ProductImageView[] }

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const withImages = {
  images: { orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] },
} satisfies Prisma.ProductInclude

type ProductWithImages = Product & { images: ProductImage[] }

export function isUuid(value: string): boolean {
  return UUID_PATTERN.test(value)
}

function toProductView(deps: StoreDeps, product: ProductWithImages): ProductView {
  return {
    ...product,
    images: product.images.map((image) => ({
      id: image.id,
      url: deps.storage.publicUrl(image.path),
      sortOrder: image.sortOrder,
    })),
  }
}


export async function listOwnProducts(deps: StoreDeps, ownerSub: string): Promise<ProductView[] | null> {
  const store = await deps.db.store.findUnique({ where: { ownerSub }, select: { id: true } })
  if (!store) return null
  return listProductsByStore(deps, store.id, false)
}

async function listProductsByStore(
  deps: StoreDeps,
  storeId: string,
  publishedOnly: boolean,
): Promise<ProductView[]> {
  const products = await deps.db.product.findMany({
    where: { storeId, ...(publishedOnly ? { isPublished: true } : {}) },
    include: withImages,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
  })
  return products.map((p) => toProductView(deps, p))
}

export function listProductsForStorePage(
  deps: StoreDeps,
  storeId: string,
  includeUnpublished: boolean,
): Promise<ProductView[]> {
  return listProductsByStore(deps, storeId, !includeUnpublished)
}

export async function getOwnProduct(
  deps: StoreDeps,
  ownerSub: string,
  productId: string,
): Promise<ProductView | null> {
  if (!isUuid(productId)) return null
  const store = await deps.db.store.findUnique({ where: { ownerSub }, select: { id: true } })
  if (!store) return null
  const product = await deps.db.product.findFirst({
    where: { id: productId, storeId: store.id },
    include: withImages,
  })
  return product ? toProductView(deps, product) : null
}

export async function createProduct(
  deps: StoreDeps,
  ownerSub: string,
  fields: ProductFields,
): Promise<{ ok: true; product: ProductView } | { ok: false; code: "no_store" | "limit_reached" }> {
  const store = await deps.db.store.findUnique({ where: { ownerSub }, select: { id: true } })
  if (!store) return { ok: false, code: "no_store" }

  return deps.db.$transaction(async (tx) => {
    // Serialize concurrent creates per store so the count check below cannot be raced.
    await tx.$queryRaw`SELECT id FROM "Store" WHERE id = ${store.id}::uuid FOR UPDATE`
    const count = await tx.product.count({ where: { storeId: store.id } })
    if (count >= MAX_PRODUCTS_PER_STORE) return { ok: false as const, code: "limit_reached" as const }
    const product = await tx.product.create({
      data: { storeId: store.id, ...fields },
      include: withImages,
    })
    return { ok: true as const, product: toProductView(deps, product) }
  })
}

export async function updateProduct(
  deps: StoreDeps,
  ownerSub: string,
  productId: string,
  fields: ProductFields,
): Promise<ProductView | null> {
  return mutateOwn(deps, ownerSub, productId, fields)
}

export async function setProductPublished(
  deps: StoreDeps,
  ownerSub: string,
  productId: string,
  isPublished: boolean,
): Promise<ProductView | null> {
  return mutateOwn(deps, ownerSub, productId, { isPublished })
}

async function mutateOwn(
  deps: StoreDeps,
  ownerSub: string,
  productId: string,
  data: Prisma.ProductUpdateManyMutationInput,
): Promise<ProductView | null> {
  if (!isUuid(productId)) return null
  const store = await deps.db.store.findUnique({ where: { ownerSub }, select: { id: true } })
  if (!store) return null
  const { count } = await deps.db.product.updateMany({
    where: { id: productId, storeId: store.id },
    data,
  })
  if (count === 0) return null
  return getOwnProduct(deps, ownerSub, productId)
}

export async function deleteProduct(deps: StoreDeps, ownerSub: string, productId: string): Promise<boolean> {
  if (!isUuid(productId)) return false
  const store = await deps.db.store.findUnique({ where: { ownerSub }, select: { id: true } })
  if (!store) return false
  const { count } = await deps.db.product.deleteMany({ where: { id: productId, storeId: store.id } })
  return count > 0
}

export async function getProductForViewer(
  deps: StoreDeps,
  slug: string,
  productId: string,
  viewerSub: string | null,
): Promise<{ store: StoreView; product: ProductView; isOwnerPreview: boolean } | null> {
  if (!isUuid(productId)) return null
  const found = await getStoreForViewer(deps, slug, viewerSub)
  if (!found) return null
  const { store } = found
  const row = await deps.db.product.findFirst({
    where: { id: productId, storeId: store.id },
    include: withImages,
  })
  if (!row) return null
  const isOwner = viewerSub !== null && viewerSub === store.ownerSub
  if (!isOwner && !(store.isPublished && row.isPublished)) return null
  return {
    store,
    product: toProductView(deps, row),
    isOwnerPreview: isOwner && (!store.isPublished || !row.isPublished),
  }
}

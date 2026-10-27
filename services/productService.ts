import { randomUUID } from "node:crypto"
import type { Product, ProductImage } from "../generated/prisma/client"
import { Prisma } from "../generated/prisma/client"
import { MAX_IMAGES_PER_PRODUCT, MAX_PRODUCTS_PER_STORE, type ProductFields } from "../lib/productValidation"
import {
  getStoreForViewer,
  removeQuietly,
  type ImageInput,
  type StoreDeps,
  type StoreView,
} from "./storeService"

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
  const images = await deps.db.productImage.findMany({
    where: { productId, product: { storeId: store.id } },
    select: { path: true },
  })
  const { count } = await deps.db.product.deleteMany({ where: { id: productId, storeId: store.id } })
  if (count > 0) await removeQuietly(deps.storage, images.map((i) => i.path))
  return count > 0
}

export async function addProductImage(
  deps: StoreDeps,
  ownerSub: string,
  productId: string,
  image: NonNullable<ImageInput>,
): Promise<{ ok: true; product: ProductView } | { ok: false; code: "not_found" | "limit_reached" }> {
  if (!isUuid(productId)) return { ok: false, code: "not_found" }
  const store = await deps.db.store.findUnique({ where: { ownerSub }, select: { id: true } })
  if (!store) return { ok: false, code: "not_found" }
  const owned = await deps.db.product.findFirst({
    where: { id: productId, storeId: store.id },
    select: { id: true },
  })
  if (!owned) return { ok: false, code: "not_found" }

  const path = `${store.id}/products/${productId}/${randomUUID()}.${image.ext}`
  await deps.storage.put(path, image.bytes, image.contentType)

  let outcome: "created" | "limit_reached" | "not_found"
  try {
    outcome = await deps.db.$transaction(async (tx) => {
      // Lock the product row so concurrent adds are serialized around the count check.
      const locked = await tx.$queryRaw<{ id: string }[]>`
        SELECT id FROM "Product" WHERE id = ${productId}::uuid FOR UPDATE`
      if (locked.length === 0) return "not_found" as const
      const count = await tx.productImage.count({ where: { productId } })
      if (count >= MAX_IMAGES_PER_PRODUCT) return "limit_reached" as const
      const max = await tx.productImage.aggregate({ where: { productId }, _max: { sortOrder: true } })
      await tx.productImage.create({
        data: { productId, path, sortOrder: (max._max.sortOrder ?? -1) + 1 },
      })
      return "created" as const
    })
  } catch (error) {
    await removeQuietly(deps.storage, [path])
    throw error
  }

  if (outcome !== "created") {
    await removeQuietly(deps.storage, [path])
    return { ok: false, code: outcome }
  }
  const product = await getOwnProduct(deps, ownerSub, productId)
  return product ? { ok: true, product } : { ok: false, code: "not_found" }
}

async function findOwnImage(deps: StoreDeps, ownerSub: string, productId: string, imageId: string) {
  if (!isUuid(productId) || !isUuid(imageId)) return null
  const store = await deps.db.store.findUnique({ where: { ownerSub }, select: { id: true } })
  if (!store) return null
  return deps.db.productImage.findFirst({
    where: { id: imageId, productId, product: { storeId: store.id } },
  })
}

export async function removeProductImage(
  deps: StoreDeps,
  ownerSub: string,
  productId: string,
  imageId: string,
): Promise<ProductView | null> {
  const image = await findOwnImage(deps, ownerSub, productId, imageId)
  if (!image) return null
  await deps.db.productImage.deleteMany({ where: { id: image.id } })
  await removeQuietly(deps.storage, [image.path])
  return getOwnProduct(deps, ownerSub, productId)
}

export async function makeProductImageFirst(
  deps: StoreDeps,
  ownerSub: string,
  productId: string,
  imageId: string,
): Promise<ProductView | null> {
  const image = await findOwnImage(deps, ownerSub, productId, imageId)
  if (!image) return null
  await deps.db.$transaction(async (tx) => {
    const min = await tx.productImage.aggregate({ where: { productId }, _min: { sortOrder: true } })
    await tx.productImage.updateMany({
      where: { id: image.id },
      data: { sortOrder: (min._min.sortOrder ?? 0) - 1 },
    })
  })
  return getOwnProduct(deps, ownerSub, productId)
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

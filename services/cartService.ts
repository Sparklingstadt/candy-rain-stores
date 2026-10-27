import { MAX_CART_ITEMS, MAX_QUANTITY, parseQuantity } from "../lib/orderValidation"
import { isUuid } from "./productService"
import type { StoreDeps } from "./storeService"

export type CartLineProblem = "unavailable" | "insufficient_stock" | "own_store"
export type CartLine = {
  itemId: string
  productId: string
  productName: string
  unitPrice: number
  quantity: number
  stock: number
  imageUrl: string | null
  problem: CartLineProblem | null
}
export type CartGroup = {
  storeId: string
  storeName: string
  storeSlug: string
  lines: CartLine[]
  subtotal: number
}
export type CartView = { groups: CartGroup[]; total: number; itemCount: number; hasProblems: boolean }
export type AddToCartResult =
  | { ok: true }
  | { ok: false; code: "not_found" | "own_store" | "cart_full" | "invalid_quantity" }

// product は store 付き、quantity は希望数。購入できれば null（注文確定でも使う）
export function lineProblem(
  product: { isPublished: boolean; stock: number; store: { isPublished: boolean; ownerSub: string } },
  quantity: number,
  buyerSub: string,
): CartLineProblem | null {
  if (product.store.ownerSub === buyerSub) return "own_store"
  if (!product.isPublished || !product.store.isPublished) return "unavailable"
  if (product.stock < quantity) return "insufficient_stock"
  return null
}

export async function getCart(deps: StoreDeps, buyerSub: string): Promise<CartView> {
  const items = await deps.db.cartItem.findMany({
    where: { buyerSub },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    include: {
      product: {
        include: {
          store: true,
          images: { orderBy: { sortOrder: "asc" }, take: 1 },
        },
      },
    },
  })

  const groups = new Map<string, CartGroup>()
  let total = 0
  let itemCount = 0
  let hasProblems = false
  for (const item of items) {
    const { product } = item
    const problem = lineProblem(product, item.quantity, buyerSub)
    const image = product.images[0]
    const line: CartLine = {
      itemId: item.id,
      productId: product.id,
      productName: product.name,
      unitPrice: product.price,
      quantity: item.quantity,
      stock: product.stock,
      imageUrl: image ? deps.storage.publicUrl(image.path) : null,
      problem,
    }
    let group = groups.get(product.storeId)
    if (!group) {
      group = {
        storeId: product.store.id,
        storeName: product.store.name,
        storeSlug: product.store.slug,
        lines: [],
        subtotal: 0,
      }
      groups.set(product.storeId, group)
    }
    const amount = product.price * item.quantity
    group.lines.push(line)
    group.subtotal += amount
    total += amount
    itemCount += item.quantity
    if (problem) hasProblems = true
  }
  return { groups: [...groups.values()], total, itemCount, hasProblems }
}

export async function countCartItems(deps: StoreDeps, buyerSub: string): Promise<number> {
  const { _sum } = await deps.db.cartItem.aggregate({ where: { buyerSub }, _sum: { quantity: true } })
  return _sum.quantity ?? 0
}

export async function addToCart(
  deps: StoreDeps,
  buyerSub: string,
  productId: string,
  quantity: string | number,
): Promise<AddToCartResult> {
  const qty = parseQuantity(quantity)
  if (qty === null) return { ok: false, code: "invalid_quantity" }
  if (!isUuid(productId)) return { ok: false, code: "not_found" }

  return deps.db.$transaction(async (tx) => {
    // 同じ購入者の追加を直列化（同じ商品の同時追加でも、30 種類の上限でも壊れない）
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${"cart:" + buyerSub}))`

    const product = await tx.product.findUnique({
      where: { id: productId },
      select: { isPublished: true, store: { select: { isPublished: true, ownerSub: true } } },
    })
    if (!product || !product.isPublished || !product.store.isPublished) {
      return { ok: false, code: "not_found" } as const
    }
    if (product.store.ownerSub === buyerSub) return { ok: false, code: "own_store" } as const

    const existing = await tx.cartItem.findUnique({
      where: { buyerSub_productId: { buyerSub, productId } },
      select: { id: true, quantity: true },
    })
    if (existing) {
      await tx.cartItem.update({
        where: { id: existing.id },
        data: { quantity: Math.min(existing.quantity + qty, MAX_QUANTITY) },
      })
      return { ok: true } as const
    }

    const distinct = await tx.cartItem.count({ where: { buyerSub } })
    if (distinct >= MAX_CART_ITEMS) return { ok: false, code: "cart_full" } as const
    await tx.cartItem.create({ data: { buyerSub, productId, quantity: qty } })
    return { ok: true } as const
  })
}

export async function setCartQuantity(
  deps: StoreDeps,
  buyerSub: string,
  itemId: string,
  quantity: string | number,
): Promise<boolean> {
  const qty = parseQuantity(quantity)
  if (qty === null || !isUuid(itemId)) return false
  const { count } = await deps.db.cartItem.updateMany({
    where: { id: itemId, buyerSub },
    data: { quantity: qty },
  })
  return count > 0
}

export async function removeFromCart(deps: StoreDeps, buyerSub: string, itemId: string): Promise<boolean> {
  if (!isUuid(itemId)) return false
  const { count } = await deps.db.cartItem.deleteMany({ where: { id: itemId, buyerSub } })
  return count > 0
}

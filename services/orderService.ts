import { randomUUID } from "node:crypto"
import type { Order, OrderItem } from "../generated/prisma/client"
import type { ShippingInfo } from "../lib/orderValidation"
import { canTransition, type OrderStatus } from "../lib/orderStatus"
import { cartVersion, lineProblem, lockCart, type CartLineProblem } from "./cartService"
import { isUuid } from "./productService"
import type { StoreDeps } from "./storeService"

export type Buyer = { sub: string; name: string; email: string }
export type OrderView = Order & { items: OrderItem[] } // items は作成順
export type OrderProblem = { productId: string; problem: CartLineProblem; stock: number }
export type PlaceOrderResult =
  | { ok: true; orderIds: string[] }
  | { ok: false; code: "empty_cart" }
  | { ok: false; code: "problems"; problems: OrderProblem[] }
  // 注文手続き画面で見せたカートから行・数量・単価が変わった。version は今のカートの版
  | { ok: false; code: "changed"; version: string }
export type ChangeResult = { ok: true } | { ok: false; code: "not_found" | "invalid_transition" | "conflict" }

// OrderItem には並び順の列がないので、1 注文の中では ID を昇順に振って作成順を表す
const withItems = { items: { orderBy: { id: "asc" } } } as const

// expectedVersion は注文手続き画面で見せたカートの版（getCart の version）
export async function placeOrder(
  deps: StoreDeps,
  buyer: Buyer,
  shipping: ShippingInfo,
  expectedVersion: string,
): Promise<PlaceOrderResult> {
  return deps.db.$transaction(async (tx) => {
    // カートの書き込み（追加・数量変更・削除）や二重送信と同じキーで直列化する
    await lockCart(tx, buyer.sub)

    const cart = await tx.cartItem.findMany({
      where: { buyerSub: buyer.sub },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      select: { id: true, productId: true, quantity: true },
    })
    if (cart.length === 0) return { ok: false, code: "empty_cart" } as const

    const productIds = cart.map((c) => c.productId)
    // デッドロックを避けるため ID 順にロックする
    await tx.$queryRaw`SELECT id FROM "Product" WHERE id = ANY(${productIds}::uuid[]) ORDER BY id FOR UPDATE`
    const products = await tx.product.findMany({
      where: { id: { in: productIds } },
      include: { store: true },
    })
    const byId = new Map(products.map((p) => [p.id, p]))

    // 画面で見せたあとに単価・数量・行が変わっていたら確定しない。
    // カートを読んでからロックを取るまでに商品（かストア）が消えた行は、CASCADE でカートからも消える
    const present = cart.filter((line) => byId.has(line.productId))
    const version = cartVersion(
      present.map((line) => ({
        itemId: line.id,
        quantity: line.quantity,
        unitPrice: byId.get(line.productId)!.price,
      })),
    )
    if (present.length < cart.length || version !== expectedVersion) {
      return { ok: false, code: "changed", version } as const
    }

    const problems: OrderProblem[] = []
    for (const line of cart) {
      const product = byId.get(line.productId)!
      const problem = lineProblem(product, line.quantity, buyer.sub)
      if (problem) problems.push({ productId: product.id, problem, stock: product.stock })
    }
    if (problems.length > 0) return { ok: false, code: "problems", problems } as const

    const groups = new Map<string, { productId: string; quantity: number }[]>()
    for (const line of cart) {
      const storeId = byId.get(line.productId)!.storeId
      const group = groups.get(storeId) ?? []
      group.push({ productId: line.productId, quantity: line.quantity })
      groups.set(storeId, group)
    }

    for (const line of [...cart].sort((a, b) => (a.productId < b.productId ? -1 : 1))) {
      await tx.product.update({
        where: { id: line.productId },
        data: { stock: { decrement: line.quantity } },
      })
    }

    const orderIds: string[] = []
    for (const [storeId, lines] of groups) {
      const store = byId.get(lines[0].productId)!.store
      const itemIds = lines.map(() => randomUUID()).sort()
      const items = lines.map((line, i) => {
        const product = byId.get(line.productId)!
        return {
          id: itemIds[i],
          productId: product.id,
          productName: product.name,
          unitPrice: product.price,
          quantity: line.quantity,
        }
      })
      const order = await tx.order.create({
        data: {
          storeId,
          storeName: store.name,
          paymentInstructions: store.paymentInstructions,
          buyerSub: buyer.sub,
          buyerName: buyer.name,
          buyerEmail: buyer.email,
          ...shipping,
          totalAmount: items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0),
          items: { create: items },
        },
        select: { id: true },
      })
      orderIds.push(order.id)
    }

    await tx.cartItem.deleteMany({ where: { id: { in: cart.map((c) => c.id) }, buyerSub: buyer.sub } })
    return { ok: true, orderIds } as const
  })
}

export async function listBuyerOrders(deps: StoreDeps, buyerSub: string): Promise<OrderView[]> {
  return deps.db.order.findMany({
    where: { buyerSub },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    include: withItems,
  })
}

export async function getBuyerOrder(deps: StoreDeps, buyerSub: string, orderId: string): Promise<OrderView | null> {
  if (!isUuid(orderId)) return null
  return deps.db.order.findFirst({ where: { id: orderId, buyerSub }, include: withItems })
}

export async function getLastShipping(deps: StoreDeps, buyerSub: string): Promise<ShippingInfo | null> {
  return deps.db.order.findFirst({
    where: { buyerSub },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    select: { postalCode: true, prefecture: true, address: true, phone: true },
  })
}

async function ownStoreId(deps: StoreDeps, ownerSub: string): Promise<string | null> {
  const store = await deps.db.store.findUnique({ where: { ownerSub }, select: { id: true } })
  return store?.id ?? null
}

export async function listStoreOrders(
  deps: StoreDeps,
  ownerSub: string,
  status?: OrderStatus,
): Promise<OrderView[] | null> {
  const storeId = await ownStoreId(deps, ownerSub)
  if (!storeId) return null
  return deps.db.order.findMany({
    where: { storeId, ...(status ? { status } : {}) },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: 100,
    include: withItems,
  })
}

export async function countReceivedOrders(deps: StoreDeps, ownerSub: string): Promise<number> {
  const storeId = await ownStoreId(deps, ownerSub)
  if (!storeId) return 0
  return deps.db.order.count({ where: { storeId, status: "RECEIVED" } })
}

export async function getStoreOrder(deps: StoreDeps, ownerSub: string, orderId: string): Promise<OrderView | null> {
  if (!isUuid(orderId)) return null
  const storeId = await ownStoreId(deps, ownerSub)
  if (!storeId) return null
  return deps.db.order.findFirst({ where: { id: orderId, storeId }, include: withItems })
}

type Ownership = { storeId: string } | { buyerSub: string }

async function changeStatus(
  deps: StoreDeps,
  actor: "owner" | "buyer",
  ownership: Ownership,
  orderId: string,
  to: OrderStatus,
): Promise<ChangeResult> {
  return deps.db.$transaction(async (tx) => {
    const order = await tx.order.findFirst({ where: { id: orderId, ...ownership }, select: { status: true } })
    if (!order) return { ok: false, code: "not_found" } as const
    const from = order.status
    if (!canTransition(actor, from, to)) return { ok: false, code: "invalid_transition" } as const

    // 読んだ状態のままのときだけ変える。同時に変えられていたら 0 件になる
    const { count } = await tx.order.updateMany({
      where: { id: orderId, status: from, ...ownership },
      data: { status: to },
    })
    if (count === 0) return { ok: false, code: "conflict" } as const

    if (to === "CANCELED") {
      const items = await tx.orderItem.findMany({
        where: { orderId, productId: { not: null } },
        orderBy: { productId: "asc" }, // placeOrder と同じ ID 順でロックする
        select: { productId: true, quantity: true },
      })
      for (const item of items) {
        // 商品が消えていれば 0 件で何もしない
        await tx.product.updateMany({
          where: { id: item.productId! },
          data: { stock: { increment: item.quantity } },
        })
      }
    }
    return { ok: true } as const
  })
}

export async function changeOrderStatusAsOwner(
  deps: StoreDeps,
  ownerSub: string,
  orderId: string,
  to: OrderStatus,
): Promise<ChangeResult> {
  if (!isUuid(orderId)) return { ok: false, code: "not_found" }
  const storeId = await ownStoreId(deps, ownerSub)
  if (!storeId) return { ok: false, code: "not_found" }
  return changeStatus(deps, "owner", { storeId }, orderId, to)
}

export async function cancelOrderAsBuyer(deps: StoreDeps, buyerSub: string, orderId: string): Promise<ChangeResult> {
  if (!isUuid(orderId)) return { ok: false, code: "not_found" }
  return changeStatus(deps, "buyer", { buyerSub }, orderId, "CANCELED")
}

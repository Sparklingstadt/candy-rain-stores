import { randomUUID } from "node:crypto"
import type { Order, OrderItem, Prisma } from "../generated/prisma/client"
import type { ShippingInfo } from "../lib/orderValidation"
import { canTransition, ORDER_STATUSES, PAYMENT_DEADLINE_DAYS, type OrderStatus } from "../lib/orderStatus"
import { cartVersion, lineProblem, lockCart, type CartLineProblem } from "./cartService"
import { isUuid } from "../lib/uuid"
import type { StoreDeps } from "./deps"
import { isStoreOwner, STORE_ID } from "./storeService"

export type Buyer = { sub: string; name: string; email: string }
export type OrderView = Order & { items: OrderItem[] } // items は作成順
// store は今のお店の公開状態と連絡先（お店がなければ null）。非公開のお店にはリンクしない
export type BuyerOrderView = OrderView & {
  store: { isPublished: boolean; contactEmail: string | null } | null
}
export type OrderProblem = { productId: string; problem: CartLineProblem; stock: number }
export type PlaceOrderResult =
  | { ok: true; orderId: string }
  | { ok: false; code: "empty_cart" }
  | { ok: false; code: "problems"; problems: OrderProblem[] }
  // 注文手続き画面で見せたカートから行・数量・単価が変わった。version は今のカートの版
  | { ok: false; code: "changed"; version: string }
  | { ok: false; code: "total_too_large" }
export type ChangeResult = { ok: true } | { ok: false; code: "not_found" | "invalid_transition" | "conflict" }

// Order.totalAmount は INTEGER。1 つの注文の合計はこれを超えられない
export const MAX_ORDER_TOTAL = 2_147_483_647

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
    const products = await tx.product.findMany({ where: { id: { in: productIds } } })
    const byId = new Map(products.map((p) => [p.id, p]))
    const store = await tx.storeSettings.findUnique({ where: { id: STORE_ID } })

    // 画面で見せたあとに単価・数量・行が変わっていたら確定しない。
    // カートを読んでからロックを取るまでに商品が消えた行は、CASCADE でカートからも消える
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
      const problem = lineProblem(product, store, line.quantity, buyer.sub)
      if (problem) problems.push({ productId: product.id, problem, stock: product.stock })
    }
    if (problems.length > 0) return { ok: false, code: "problems", problems } as const

    // problems が空なら、お店はあって公開中
    if (!store) return { ok: false, code: "problems", problems: [] } as const
    const total = cart.reduce((sum, line) => sum + byId.get(line.productId)!.price * line.quantity, 0)
    if (total > MAX_ORDER_TOTAL) return { ok: false, code: "total_too_large" } as const

    for (const line of [...cart].sort((a, b) => (a.productId < b.productId ? -1 : 1))) {
      await tx.product.update({
        where: { id: line.productId },
        data: { stock: { decrement: line.quantity } },
      })
    }

    const itemIds = cart.map(() => randomUUID()).sort()
    const order = await tx.order.create({
      data: {
        storeName: store.name,
        paymentInstructions: store.paymentInstructions,
        buyerSub: buyer.sub,
        buyerName: buyer.name,
        buyerEmail: buyer.email,
        ...shipping,
        totalAmount: total,
        items: {
          create: cart.map((line, i) => {
            const product = byId.get(line.productId)!
            return {
              id: itemIds[i],
              productId: product.id,
              productName: product.name,
              unitPrice: product.price,
              quantity: line.quantity,
            }
          }),
        },
      },
      select: { id: true },
    })

    await tx.cartItem.deleteMany({ where: { id: { in: cart.map((c) => c.id) }, buyerSub: buyer.sub } })
    return { ok: true, orderId: order.id } as const
  })
}

export async function listBuyerOrders(deps: StoreDeps, buyerSub: string): Promise<OrderView[]> {
  return deps.db.order.findMany({
    where: { buyerSub },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    include: withItems,
  })
}

export async function getBuyerOrder(
  deps: StoreDeps,
  buyerSub: string,
  orderId: string,
): Promise<BuyerOrderView | null> {
  if (!isUuid(orderId)) return null
  const order = await deps.db.order.findFirst({ where: { id: orderId, buyerSub }, include: withItems })
  if (!order) return null
  const store = await deps.db.storeSettings.findUnique({
    where: { id: STORE_ID },
    select: { isPublished: true, contactEmail: true },
  })
  return { ...order, store }
}

export async function getLastShipping(deps: StoreDeps, buyerSub: string): Promise<ShippingInfo | null> {
  return deps.db.order.findFirst({
    where: { buyerSub },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    select: { postalCode: true, prefecture: true, address: true, phone: true },
  })
}

export async function listStoreOrders(
  deps: StoreDeps,
  ownerSub: string,
  status?: OrderStatus,
): Promise<OrderView[] | null> {
  if (!(await isStoreOwner(deps, ownerSub))) return null
  return deps.db.order.findMany({
    where: status ? { status } : {},
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: 100,
    include: withItems,
  })
}

export async function countReceivedOrders(deps: StoreDeps, ownerSub: string): Promise<number> {
  if (!(await isStoreOwner(deps, ownerSub))) return 0
  return deps.db.order.count({ where: { status: "RECEIVED" } })
}

// 状態ごとの件数を 1 回のクエリで数える。ストアがなければ null
export async function countStoreOrdersByStatus(
  deps: StoreDeps,
  ownerSub: string,
): Promise<Record<OrderStatus, number> | null> {
  if (!(await isStoreOwner(deps, ownerSub))) return null
  const groups = await deps.db.order.groupBy({ by: ["status"], _count: { _all: true } })
  const counts = Object.fromEntries(ORDER_STATUSES.map((s) => [s, 0])) as Record<OrderStatus, number>
  for (const g of groups) counts[g.status] = g._count._all
  return counts
}

export async function getStoreOrder(deps: StoreDeps, ownerSub: string, orderId: string): Promise<OrderView | null> {
  if (!isUuid(orderId)) return null
  if (!(await isStoreOwner(deps, ownerSub))) return null
  return deps.db.order.findFirst({ where: { id: orderId }, include: withItems })
}

// scope は変えてよい注文の条件（オーナーならすべて、期限切れなら受付のまま期限を過ぎたもの）
async function changeStatus(
  deps: StoreDeps,
  scope: Prisma.OrderWhereInput,
  orderId: string,
  to: OrderStatus,
): Promise<ChangeResult> {
  return deps.db.$transaction(async (tx) => {
    const order = await tx.order.findFirst({ where: { ...scope, id: orderId }, select: { status: true } })
    if (!order) return { ok: false, code: "not_found" } as const
    const from = order.status
    if (!canTransition(from, to)) return { ok: false, code: "invalid_transition" } as const

    // 読んだ状態のままのときだけ変える。同時に変えられていたら 0 件になる
    const { count } = await tx.order.updateMany({
      where: { ...scope, id: orderId, status: from },
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
  if (!(await isStoreOwner(deps, ownerSub))) return { ok: false, code: "not_found" }
  return changeStatus(deps, {}, orderId, to)
}

// 一度に取り消す件数の上限。残りは次の実行で取り消す
const EXPIRE_BATCH = 200

// 受付のまま支払期限（paymentDeadline）を過ぎた注文をキャンセルし、在庫を戻す。
// 1 件ずつオーナーのキャンセルと同じ手順で行うので、同時にオーナーが支払確認していれば取り消さない。
// 取り消した注文の数を返す
export async function expireUnpaidOrders(deps: StoreDeps, now: Date): Promise<{ canceled: number }> {
  const cutoff = new Date(now.getTime() - PAYMENT_DEADLINE_DAYS * 24 * 60 * 60 * 1000)
  const scope = { status: "RECEIVED", createdAt: { lt: cutoff } } satisfies Prisma.OrderWhereInput
  const orders = await deps.db.order.findMany({
    where: scope,
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    take: EXPIRE_BATCH,
    select: { id: true },
  })
  let canceled = 0
  for (const order of orders) {
    const result = await changeStatus(deps, scope, order.id, "CANCELED")
    if (result.ok) canceled++
  }
  return { canceled }
}

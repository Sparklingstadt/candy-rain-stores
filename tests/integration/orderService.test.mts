import { after, beforeEach, describe, it } from "node:test"
import assert from "node:assert/strict"
import { randomUUID } from "node:crypto"
import { prisma } from "../../lib/prisma"
import { assertResettableDatabase } from "../assertResettableDatabase"
import { MemoryImageStorage } from "../../lib/imageStorage"
import type { StoreDeps } from "../../services/deps"
import { addToCart, getCart, setCartQuantity } from "../../services/cartService"
import {
  changeOrderStatusAsOwner,
  expireUnpaidOrders,
  countReceivedOrders,
  countStoreOrdersByStatus,
  getBuyerOrder,
  getLastShipping,
  getStoreOrder,
  listBuyerOrders,
  listStoreOrders,
  MAX_ORDER_TOTAL,
  placeOrder,
  type Buyer,
} from "../../services/orderService"

const BUYER: Buyer = { sub: "buyer-1", name: "あめ子", email: "ameko@example.com" }
const OTHER: Buyer = { sub: "buyer-2", name: "あめ太", email: "ameta@example.com" }
const SHIPPING = { postalCode: "123-4567", prefecture: "東京都", address: "千代田区1-1", phone: "03-1234-5678" }
let deps: StoreDeps

beforeEach(async () => {
  assertResettableDatabase(process.env.DATABASE_URL)
  await prisma.order.deleteMany()
  await prisma.cartItem.deleteMany()
  await prisma.product.deleteMany()
  await prisma.storeSettings.deleteMany()
  deps = { db: prisma, storage: new MemoryImageStorage() }
})

after(async () => {
  await prisma.$disconnect()
})

const OWNER = "owner"

// サイトのお店（1 つだけ）。2 回目からは渡した値で更新して返す
async function makeStore(o: { ownerSub?: string; name?: string; paymentInstructions?: string | null } = {}) {
  const data = {
    ownerSub: o.ownerSub ?? OWNER,
    name: o.name ?? "あめ屋",
    isPublished: true,
    paymentInstructions: o.paymentInstructions ?? null,
  }
  return prisma.storeSettings.upsert({ where: { id: 1 }, create: data, update: data })
}

async function makeProduct(o: { isPublished?: boolean; stock?: number; price?: number; name?: string } = {}) {
  return prisma.product.create({
    data: {
      name: o.name ?? "いちご飴",
      price: o.price ?? 300,
      stock: o.stock ?? 5,
      isPublished: o.isPublished ?? true,
    },
  })
}

async function stockOf(id: string) {
  return (await prisma.product.findUniqueOrThrow({ where: { id } })).stock
}

async function add(buyer: Buyer, productId: string, qty: number) {
  assert.deepEqual(await addToCart(deps, buyer.sub, productId, qty), { ok: true })
}

// 注文手続き画面を表示した（カートの版を受け取った）直後に確定する
async function place(buyer: Buyer, shipping: typeof SHIPPING = SHIPPING) {
  const { version } = await getCart(deps, buyer.sub)
  return placeOrder(deps, buyer, shipping, version)
}

async function orderOne(buyer = BUYER, o: { stock?: number; qty?: number } = {}) {
  const store = await makeStore()
  const product = await makeProduct({ stock: o.stock ?? 5 })
  await add(buyer, product.id, o.qty ?? 2)
  const r = await place(buyer)
  assert.equal(r.ok, true)
  if (!r.ok) throw new Error("unreachable")
  return { store, product, orderId: r.orderId }
}

// Rows made in the same millisecond would tie on createdAt and fall back to random ids,
// so tests that assert an order give each row a distinct createdAt in the order given.
const PINNED_BASE = Date.UTC(2026, 0, 1)

async function pinCartOrder(buyerSub: string, productIds: string[]) {
  for (const [i, productId] of productIds.entries()) {
    await prisma.cartItem.updateMany({
      where: { buyerSub, productId },
      data: { createdAt: new Date(PINNED_BASE + i * 1000) },
    })
  }
}

async function pinOrderTimes(orderIds: string[]) {
  for (const [i, id] of orderIds.entries()) {
    await prisma.order.update({ where: { id }, data: { createdAt: new Date(PINNED_BASE + i * 1000) } })
  }
}

describe("placeOrder", () => {
  it("creates one order with snapshots, decrements stock and empties the cart", async () => {
    await makeStore({ name: "店1", paymentInstructions: "銀行振込でお願いします" })
    const a = await makeProduct({ name: "A", price: 100, stock: 9 })
    const b = await makeProduct({ name: "B", price: 200, stock: 9 })
    const c = await makeProduct({ name: "C", price: 50, stock: 3 })
    await add(BUYER, a.id, 2)
    await add(BUYER, b.id, 1)
    await add(BUYER, c.id, 3)
    await pinCartOrder(BUYER.sub, [a.id, b.id, c.id])

    const r = await place(BUYER)
    assert.equal(r.ok, true)
    if (!r.ok) throw new Error("unreachable")
    assert.equal(await prisma.order.count(), 1)

    const o = await getBuyerOrder(deps, BUYER.sub, r.orderId)
    assert.ok(o)
    assert.equal(o.storeName, "店1")
    assert.equal(o.paymentInstructions, "銀行振込でお願いします")
    assert.equal(o.totalAmount, 100 * 2 + 200 + 50 * 3)
    assert.deepEqual(
      o.items.map((i) => [i.productId, i.productName, i.unitPrice, i.quantity]),
      [
        [a.id, "A", 100, 2],
        [b.id, "B", 200, 1],
        [c.id, "C", 50, 3],
      ],
    )
    assert.equal(o.status, "RECEIVED")
    assert.equal(o.buyerSub, BUYER.sub)
    assert.equal(o.buyerName, "あめ子")
    assert.equal(o.buyerEmail, "ameko@example.com")
    assert.equal(o.postalCode, "123-4567")
    assert.equal(o.prefecture, "東京都")
    assert.equal(o.address, "千代田区1-1")
    assert.equal(o.phone, "03-1234-5678")
    assert.equal(await stockOf(a.id), 7)
    assert.equal(await stockOf(b.id), 8)
    assert.equal(await stockOf(c.id), 0)
    assert.equal(await prisma.cartItem.count({ where: { buyerSub: BUYER.sub } }), 0)
  })

  it("keeps the store name and payment instructions as they were when ordered", async () => {
    await makeStore({ name: "店1", paymentInstructions: "振込" })
    const p = await makeProduct()
    await add(BUYER, p.id, 1)
    const r = await place(BUYER)
    if (!r.ok) throw new Error("order failed")
    await makeStore({ name: "新しい名前", paymentInstructions: null })
    const o = await getBuyerOrder(deps, BUYER.sub, r.orderId)
    assert.equal(o?.storeName, "店1")
    assert.equal(o?.paymentInstructions, "振込")
  })

  it("records the price at checkout time", async () => {
    await makeStore()
    const p = await makeProduct({ price: 1200 })
    await add(BUYER, p.id, 1)
    await prisma.product.update({ where: { id: p.id }, data: { price: 1500 } })
    const r = await place(BUYER)
    assert.equal(r.ok, true)
    if (!r.ok) throw new Error("unreachable")
    const order = await getBuyerOrder(deps, BUYER.sub, r.orderId)
    assert.equal(order?.items[0].unitPrice, 1500)
    assert.equal(order?.totalAmount, 1500)
  })

  it("returns problems and writes nothing when stock is short", async () => {
    await makeStore()
    const ok = await makeProduct({ name: "ok", stock: 5 })
    const short = await makeProduct({ name: "short", stock: 3 })
    await add(BUYER, ok.id, 2)
    await add(BUYER, short.id, 3)
    await prisma.product.update({ where: { id: short.id }, data: { stock: 1 } })

    const r = await place(BUYER)
    assert.deepEqual(r, {
      ok: false,
      code: "problems",
      problems: [{ productId: short.id, problem: "insufficient_stock", stock: 1 }],
    })
    assert.equal(await prisma.order.count(), 0)
    assert.equal(await stockOf(ok.id), 5)
    assert.equal(await stockOf(short.id), 1)
    assert.equal(await prisma.cartItem.count({ where: { buyerSub: BUYER.sub } }), 2)
  })

  it("reports unavailable", async () => {
    await makeStore()
    const hidden = await makeProduct({ name: "hidden" })
    const shown = await makeProduct({ name: "shown" })
    await add(BUYER, hidden.id, 1)
    await add(BUYER, shown.id, 1)
    await pinCartOrder(BUYER.sub, [hidden.id, shown.id])
    await prisma.product.update({ where: { id: hidden.id }, data: { isPublished: false } })

    assert.deepEqual(await place(BUYER), {
      ok: false,
      code: "problems",
      problems: [{ productId: hidden.id, problem: "unavailable", stock: 5 }],
    })
    assert.equal(await prisma.order.count(), 0)
  })

  it("reports every line as unavailable once the store is unpublished", async () => {
    await makeStore()
    const p = await makeProduct({ stock: 4 })
    await add(BUYER, p.id, 1)
    await prisma.storeSettings.updateMany({ data: { isPublished: false } })
    assert.deepEqual(await place(BUYER), {
      ok: false,
      code: "problems",
      problems: [{ productId: p.id, problem: "unavailable", stock: 4 }],
    })
    assert.equal(await prisma.order.count(), 0)
  })

  it("reports own_store when the buyer is the owner", async () => {
    await makeStore({ ownerSub: BUYER.sub })
    const own = await makeProduct({ name: "own", stock: 4 })
    // 自分のお店の商品はカートに入れられないので直接行を作る
    await prisma.cartItem.create({ data: { buyerSub: BUYER.sub, productId: own.id, quantity: 1 } })
    assert.deepEqual(await place(BUYER), {
      ok: false,
      code: "problems",
      problems: [{ productId: own.id, problem: "own_store", stock: 4 }],
    })
    assert.equal(await prisma.order.count(), 0)
  })

  it("returns empty_cart", async () => {
    assert.deepEqual(await place(BUYER), { ok: false, code: "empty_cart" })
  })

  it("lets only one of two buyers take the last item", async () => {
    await makeStore()
    const p = await makeProduct({ stock: 1 })
    await add(BUYER, p.id, 1)
    await add(OTHER, p.id, 1)
    const results = await Promise.all([place(BUYER), place(OTHER)])
    const wins = results.filter((r) => r.ok)
    const losses = results.filter((r) => !r.ok)
    assert.equal(wins.length, 1)
    assert.deepEqual(losses, [
      { ok: false, code: "problems", problems: [{ productId: p.id, problem: "insufficient_stock", stock: 0 }] },
    ])
    assert.equal(await stockOf(p.id), 0)
    assert.equal(await prisma.order.count(), 1)
  })

  it("creates one order on a double submit", async () => {
    await makeStore()
    const p = await makeProduct({ stock: 5 })
    await add(BUYER, p.id, 2)
    const results = await Promise.all([place(BUYER), place(BUYER)])
    assert.equal(results.filter((r) => r.ok).length, 1)
    assert.deepEqual(
      results.filter((r) => !r.ok),
      [{ ok: false, code: "empty_cart" }],
    )
    assert.equal(await prisma.order.count(), 1)
    assert.equal(await stockOf(p.id), 3)
  })
})

describe("placeOrder with a stale checkout", () => {
  // 注文手続き画面を表示したあとでカートや商品が変わる
  async function viewCheckout() {
    await makeStore()
    const a = await makeProduct({ name: "A", price: 100, stock: 9 })
    const b = await makeProduct({ name: "B", price: 200, stock: 9 })
    await add(BUYER, a.id, 2)
    await add(BUYER, b.id, 1)
    const { version } = await getCart(deps, BUYER.sub)
    return { a, b, version }
  }

  async function assertNothingPlaced(a: { id: string }, b: { id: string }) {
    assert.equal(await prisma.order.count(), 0)
    assert.equal(await stockOf(a.id), 9)
    assert.equal(await stockOf(b.id), 9)
  }

  it("returns changed when a price changed", async () => {
    const { a, b, version } = await viewCheckout()
    await prisma.product.update({ where: { id: a.id }, data: { price: 150 } })
    const r = await placeOrder(deps, BUYER, SHIPPING, version)
    assert.deepEqual(r, { ok: false, code: "changed", version: (await getCart(deps, BUYER.sub)).version })
    await assertNothingPlaced(a, b)
    assert.equal(await prisma.cartItem.count({ where: { buyerSub: BUYER.sub } }), 2)
  })

  it("returns changed when a product was deleted", async () => {
    const { a, b, version } = await viewCheckout()
    await prisma.product.delete({ where: { id: a.id } })
    const r = await placeOrder(deps, BUYER, SHIPPING, version)
    assert.deepEqual(r, { ok: false, code: "changed", version: (await getCart(deps, BUYER.sub)).version })
    assert.equal(await prisma.order.count(), 0)
    assert.equal(await stockOf(b.id), 9)
    assert.equal(await prisma.cartItem.count({ where: { buyerSub: BUYER.sub } }), 1)
  })

  it("returns changed when a quantity changed", async () => {
    const { a, b, version } = await viewCheckout()
    const item = await prisma.cartItem.findFirstOrThrow({ where: { buyerSub: BUYER.sub, productId: b.id } })
    assert.equal(await setCartQuantity(deps, BUYER.sub, item.id, 3), true)
    const r = await placeOrder(deps, BUYER, SHIPPING, version)
    assert.equal(r.ok === false && r.code, "changed")
    await assertNothingPlaced(a, b)
  })

  it("returns changed for a missing version", async () => {
    const { a, b } = await viewCheckout()
    const r = await placeOrder(deps, BUYER, SHIPPING, "")
    assert.equal(r.ok === false && r.code, "changed")
    await assertNothingPlaced(a, b)
  })
})

describe("placeOrder total limit", () => {
  it("returns total_too_large and creates nothing when the total exceeds the limit", async () => {
    await makeStore()
    const p = await makeProduct({ price: 1_100_000_000, stock: 9 })
    const q = await makeProduct({ price: 100, stock: 9 })
    await add(BUYER, p.id, 2)
    await add(BUYER, q.id, 1)
    assert.deepEqual(await place(BUYER), { ok: false, code: "total_too_large" })
    assert.equal(await prisma.order.count(), 0)
    assert.equal(await stockOf(p.id), 9)
    assert.equal(await stockOf(q.id), 9)
    assert.equal(await prisma.cartItem.count({ where: { buyerSub: BUYER.sub } }), 2)
  })

  it("accepts a total exactly at the limit", async () => {
    assert.equal(MAX_ORDER_TOTAL, 2_147_483_647)
    await makeStore()
    const p = await makeProduct({ price: MAX_ORDER_TOTAL - 1 })
    const q = await makeProduct({ price: 1 })
    await add(BUYER, p.id, 1)
    await add(BUYER, q.id, 1)
    const r = await place(BUYER)
    assert.equal(r.ok, true)
    if (!r.ok) throw new Error("unreachable")
    assert.equal((await getBuyerOrder(deps, BUYER.sub, r.orderId))?.totalAmount, MAX_ORDER_TOTAL)
  })
})

describe("changeOrderStatusAsOwner", () => {
  it("moves RECEIVED → PAID → SHIPPED", async () => {
    const { store, orderId } = await orderOne()
    assert.deepEqual(await changeOrderStatusAsOwner(deps, store.ownerSub, orderId, "PAID"), { ok: true })
    assert.deepEqual(await changeOrderStatusAsOwner(deps, store.ownerSub, orderId, "SHIPPED"), { ok: true })
    assert.equal((await getStoreOrder(deps, store.ownerSub, orderId))?.status, "SHIPPED")
  })

  it("rejects invalid transitions", async () => {
    const { store, orderId } = await orderOne()
    assert.deepEqual(await changeOrderStatusAsOwner(deps, store.ownerSub, orderId, "SHIPPED"), {
      ok: false,
      code: "invalid_transition",
    })
    await changeOrderStatusAsOwner(deps, store.ownerSub, orderId, "PAID")
    await changeOrderStatusAsOwner(deps, store.ownerSub, orderId, "SHIPPED")
    assert.deepEqual(await changeOrderStatusAsOwner(deps, store.ownerSub, orderId, "CANCELED"), {
      ok: false,
      code: "invalid_transition",
    })
  })

  it("returns not_found for anyone but the owner and malformed ids", async () => {
    const { store, orderId } = await orderOne()
    for (const sub of [BUYER.sub, "no-store"]) {
      assert.deepEqual(await changeOrderStatusAsOwner(deps, sub, orderId, "PAID"), {
        ok: false,
        code: "not_found",
      })
    }
    assert.equal((await getStoreOrder(deps, store.ownerSub, orderId))?.status, "RECEIVED")
    assert.deepEqual(await changeOrderStatusAsOwner(deps, store.ownerSub, "abc", "PAID"), {
      ok: false,
      code: "not_found",
    })
    assert.deepEqual(await changeOrderStatusAsOwner(deps, store.ownerSub, randomUUID(), "PAID"), {
      ok: false,
      code: "not_found",
    })
  })

  it("restores stock when canceling a PAID order", async () => {
    const { store, product, orderId } = await orderOne(BUYER, { stock: 5, qty: 2 })
    assert.equal(await stockOf(product.id), 3)
    await changeOrderStatusAsOwner(deps, store.ownerSub, orderId, "PAID")
    assert.deepEqual(await changeOrderStatusAsOwner(deps, store.ownerSub, orderId, "CANCELED"), { ok: true })
    assert.equal(await stockOf(product.id), 5)
  })
})

describe("canceling", () => {
  it("lets only one of concurrent owner cancels win and restores stock once", async () => {
    const { store, product, orderId } = await orderOne(BUYER, { stock: 5, qty: 2 })
    const results = await Promise.all([
      changeOrderStatusAsOwner(deps, store.ownerSub, orderId, "CANCELED"),
      changeOrderStatusAsOwner(deps, store.ownerSub, orderId, "CANCELED"),
    ])
    assert.equal(results.filter((r) => r.ok).length, 1)
    assert.deepEqual(
      results.filter((r) => !r.ok),
      [{ ok: false, code: "conflict" }],
    )
    assert.equal(await stockOf(product.id), 5)
  })

  it("keeps items of a deleted product and restores nothing for them", async () => {
    await makeStore()
    const gone = await makeProduct({ name: "gone", stock: 5 })
    const kept = await makeProduct({ name: "kept", stock: 5 })
    await add(BUYER, gone.id, 1)
    await add(BUYER, kept.id, 2)
    const r = await place(BUYER)
    if (!r.ok) throw new Error("order failed")
    await prisma.product.delete({ where: { id: gone.id } })

    assert.deepEqual(await changeOrderStatusAsOwner(deps, OWNER, r.orderId, "CANCELED"), { ok: true })
    const order = await getBuyerOrder(deps, BUYER.sub, r.orderId)
    assert.deepEqual(
      order?.items.map((i) => [i.productId, i.productName]),
      [
        [null, "gone"],
        [kept.id, "kept"],
      ],
    )
    assert.equal(await stockOf(kept.id), 5)
    assert.equal(await prisma.product.count({ where: { id: gone.id } }), 0)
  })
})

describe("reads", () => {
  it("lists and gets only the buyer's own orders, newest first", async () => {
    const first = await orderOne()
    const second = await orderOne()
    const others = await orderOne(OTHER)
    await pinOrderTimes([first.orderId, second.orderId, others.orderId])
    const list = await listBuyerOrders(deps, BUYER.sub)
    assert.deepEqual(
      list.map((o) => o.id),
      [second.orderId, first.orderId],
    )
    assert.equal(list[0].items.length, 1)
    assert.equal(await getBuyerOrder(deps, BUYER.sub, others.orderId), null)
    assert.equal(await getBuyerOrder(deps, BUYER.sub, "abc"), null)
    assert.ok(await getBuyerOrder(deps, OTHER.sub, others.orderId))
  })

  it("gets the store's published state and current contact with the buyer's order", async () => {
    const { orderId } = await orderOne()
    assert.deepEqual((await getBuyerOrder(deps, BUYER.sub, orderId))?.store, {
      isPublished: true,
      contactEmail: null,
    })
    await prisma.storeSettings.updateMany({ data: { isPublished: false, contactEmail: "shop@example.com" } })
    assert.deepEqual((await getBuyerOrder(deps, BUYER.sub, orderId))?.store, {
      isPublished: false,
      contactEmail: "shop@example.com",
    })
  })

  it("lists store orders with an optional status filter and counts RECEIVED", async () => {
    const store = await makeStore()
    const p = await makeProduct({ stock: 9 })
    const ids: string[] = []
    for (let i = 0; i < 3; i++) {
      await add(BUYER, p.id, 1)
      const r = await place(BUYER)
      if (!r.ok) throw new Error("order failed")
      ids.push(r.orderId)
    }
    await pinOrderTimes(ids)
    await changeOrderStatusAsOwner(deps, store.ownerSub, ids[1], "PAID")

    const all = await listStoreOrders(deps, store.ownerSub)
    assert.deepEqual(
      all?.map((o) => o.id),
      [ids[2], ids[1], ids[0]],
    )
    assert.equal(all?.[0].items.length, 1)
    const paid = await listStoreOrders(deps, store.ownerSub, "PAID")
    assert.deepEqual(
      paid?.map((o) => o.id),
      [ids[1]],
    )
    assert.equal(await listStoreOrders(deps, "no-store"), null)
    assert.equal(await countReceivedOrders(deps, store.ownerSub), 2)
    assert.equal(await countReceivedOrders(deps, "no-store"), 0)
    assert.ok(await getStoreOrder(deps, store.ownerSub, ids[0]))
    assert.equal(await getStoreOrder(deps, "no-store", ids[0]), null)
    assert.equal(await getStoreOrder(deps, store.ownerSub, "abc"), null)
  })

  it("counts the orders by status", async () => {
    const store = await makeStore()
    const p = await makeProduct({ stock: 9 })
    const ids: string[] = []
    for (let i = 0; i < 4; i++) {
      await add(BUYER, p.id, 1)
      const r = await place(BUYER)
      if (!r.ok) throw new Error("order failed")
      ids.push(r.orderId)
    }
    await changeOrderStatusAsOwner(deps, store.ownerSub, ids[1], "PAID")
    await changeOrderStatusAsOwner(deps, store.ownerSub, ids[2], "PAID")
    await changeOrderStatusAsOwner(deps, store.ownerSub, ids[2], "SHIPPED")
    await changeOrderStatusAsOwner(deps, store.ownerSub, ids[3], "CANCELED")

    assert.deepEqual(await countStoreOrdersByStatus(deps, store.ownerSub), {
      RECEIVED: 1,
      PAID: 1,
      SHIPPED: 1,
      CANCELED: 1,
    })
    assert.equal(await countStoreOrdersByStatus(deps, "no-store"), null)
    await prisma.order.deleteMany()
    assert.deepEqual(await countStoreOrdersByStatus(deps, store.ownerSub), {
      RECEIVED: 0,
      PAID: 0,
      SHIPPED: 0,
      CANCELED: 0,
    })
  })

  it("returns the shipping of the latest order", async () => {
    assert.equal(await getLastShipping(deps, BUYER.sub), null)
    const older = await orderOne()
    await makeStore()
    const p = await makeProduct()
    await add(BUYER, p.id, 1)
    const latest = { postalCode: "987-6543", prefecture: "大阪府", address: "北区2-2", phone: "0612345678" }
    const r = await place(BUYER, latest)
    if (!r.ok) throw new Error("order failed")
    await pinOrderTimes([older.orderId, r.orderId])
    assert.deepEqual(await getLastShipping(deps, BUYER.sub), latest)
    assert.equal(await getLastShipping(deps, OTHER.sub), null)
  })
})

describe("expireUnpaidOrders", () => {
  const DAY = 24 * 60 * 60 * 1000
  async function age(orderId: string, days: number) {
    await prisma.order.update({ where: { id: orderId }, data: { createdAt: new Date(Date.now() - days * DAY) } })
  }
  async function statusOf(orderId: string) {
    return (await prisma.order.findUniqueOrThrow({ where: { id: orderId } })).status
  }

  it("cancels RECEIVED orders past the deadline and restores their stock", async () => {
    const { product, orderId } = await orderOne(BUYER, { stock: 5, qty: 2 })
    await age(orderId, 8)
    assert.equal(await stockOf(product.id), 3)

    assert.deepEqual(await expireUnpaidOrders(deps, new Date()), { canceled: 1 })
    assert.equal(await statusOf(orderId), "CANCELED")
    assert.equal(await stockOf(product.id), 5)
    // 2 回目は何もしない（在庫を二重に戻さない）
    assert.deepEqual(await expireUnpaidOrders(deps, new Date()), { canceled: 0 })
    assert.equal(await stockOf(product.id), 5)
  })

  it("leaves orders within the deadline and orders that are not RECEIVED", async () => {
    const fresh = await orderOne(BUYER)
    await age(fresh.orderId, 6)
    const paid = await orderOne(OTHER)
    await changeOrderStatusAsOwner(deps, paid.store.ownerSub, paid.orderId, "PAID")
    await age(paid.orderId, 30)

    assert.deepEqual(await expireUnpaidOrders(deps, new Date()), { canceled: 0 })
    assert.equal(await statusOf(fresh.orderId), "RECEIVED")
    assert.equal(await statusOf(paid.orderId), "PAID")
  })

  it("does not cancel an order the owner marks PAID at the same time", async () => {
    const { store, product, orderId } = await orderOne(BUYER, { stock: 5, qty: 2 })
    await age(orderId, 8)
    const [owner, expired] = await Promise.all([
      changeOrderStatusAsOwner(deps, store.ownerSub, orderId, "PAID"),
      expireUnpaidOrders(deps, new Date()),
    ])
    const status = await statusOf(orderId)
    if (owner.ok) {
      assert.equal(status, "PAID")
      assert.equal(expired.canceled, 0)
      assert.equal(await stockOf(product.id), 3)
    } else {
      assert.equal(status, "CANCELED")
      assert.equal(expired.canceled, 1)
      assert.equal(await stockOf(product.id), 5)
    }
  })
})

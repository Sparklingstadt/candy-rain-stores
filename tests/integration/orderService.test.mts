import { after, beforeEach, describe, it } from "node:test"
import assert from "node:assert/strict"
import { randomUUID } from "node:crypto"
import { prisma } from "../../lib/prisma"
import { assertResettableDatabase } from "../assertResettableDatabase"
import { MemoryImageStorage } from "../../lib/imageStorage"
import { deleteStore, type StoreDeps } from "../../services/storeService"
import { addToCart, getCart, setCartQuantity } from "../../services/cartService"
import {
  cancelOrderAsBuyer,
  changeOrderStatusAsOwner,
  countReceivedOrders,
  getBuyerOrder,
  getLastShipping,
  getStoreOrder,
  listBuyerOrders,
  listStoreOrders,
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
  await prisma.store.deleteMany()
  deps = { db: prisma, storage: new MemoryImageStorage() }
})

after(async () => {
  await prisma.$disconnect()
})

let seq = 0
async function makeStore(o: { ownerSub?: string; name?: string; paymentInstructions?: string | null } = {}) {
  return prisma.store.create({
    data: {
      ownerSub: o.ownerSub ?? `owner-${++seq}`,
      slug: `shop-${randomUUID().slice(0, 8)}`,
      name: o.name ?? "あめ屋",
      isPublished: true,
      paymentInstructions: o.paymentInstructions ?? null,
    },
  })
}

async function makeProduct(
  storeId: string,
  o: { isPublished?: boolean; stock?: number; price?: number; name?: string } = {},
) {
  return prisma.product.create({
    data: {
      storeId,
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
  const product = await makeProduct(store.id, { stock: o.stock ?? 5 })
  await add(buyer, product.id, o.qty ?? 2)
  const r = await place(buyer)
  assert.equal(r.ok, true)
  if (!r.ok) throw new Error("unreachable")
  return { store, product, orderId: r.orderIds[0] }
}

describe("placeOrder", () => {
  it("creates one order per store with snapshots, decrements stock and empties the cart", async () => {
    const s1 = await makeStore({ name: "店1", paymentInstructions: "銀行振込でお願いします" })
    const s2 = await makeStore({ name: "店2" })
    const a = await makeProduct(s1.id, { name: "A", price: 100, stock: 9 })
    const b = await makeProduct(s2.id, { name: "B", price: 200, stock: 9 })
    const c = await makeProduct(s1.id, { name: "C", price: 50, stock: 3 })
    await add(BUYER, a.id, 2)
    await add(BUYER, b.id, 1)
    await add(BUYER, c.id, 3)

    const r = await place(BUYER)
    assert.equal(r.ok, true)
    if (!r.ok) throw new Error("unreachable")
    assert.equal(r.orderIds.length, 2)

    const [o1, o2] = await Promise.all(r.orderIds.map((id) => getBuyerOrder(deps, BUYER.sub, id)))
    assert.ok(o1 && o2)
    assert.equal(o1.storeId, s1.id)
    assert.equal(o1.storeName, "店1")
    assert.equal(o1.paymentInstructions, "銀行振込でお願いします")
    assert.equal(o1.totalAmount, 100 * 2 + 50 * 3)
    assert.deepEqual(
      o1.items.map((i) => [i.productId, i.productName, i.unitPrice, i.quantity]),
      [
        [a.id, "A", 100, 2],
        [c.id, "C", 50, 3],
      ],
    )
    assert.equal(o2.storeName, "店2")
    assert.equal(o2.paymentInstructions, null)
    assert.equal(o2.totalAmount, 200)
    for (const o of [o1, o2]) {
      assert.equal(o.status, "RECEIVED")
      assert.equal(o.buyerSub, BUYER.sub)
      assert.equal(o.buyerName, "あめ子")
      assert.equal(o.buyerEmail, "ameko@example.com")
      assert.equal(o.postalCode, "123-4567")
      assert.equal(o.prefecture, "東京都")
      assert.equal(o.address, "千代田区1-1")
      assert.equal(o.phone, "03-1234-5678")
    }
    assert.equal(await stockOf(a.id), 7)
    assert.equal(await stockOf(b.id), 8)
    assert.equal(await stockOf(c.id), 0)
    assert.equal(await prisma.cartItem.count({ where: { buyerSub: BUYER.sub } }), 0)
  })

  it("records the price at checkout time", async () => {
    const s = await makeStore()
    const p = await makeProduct(s.id, { price: 1200 })
    await add(BUYER, p.id, 1)
    await prisma.product.update({ where: { id: p.id }, data: { price: 1500 } })
    const r = await place(BUYER)
    assert.equal(r.ok, true)
    if (!r.ok) throw new Error("unreachable")
    const order = await getBuyerOrder(deps, BUYER.sub, r.orderIds[0])
    assert.equal(order?.items[0].unitPrice, 1500)
    assert.equal(order?.totalAmount, 1500)
  })

  it("returns problems and writes nothing when stock is short", async () => {
    const s = await makeStore()
    const ok = await makeProduct(s.id, { name: "ok", stock: 5 })
    const short = await makeProduct(s.id, { name: "short", stock: 3 })
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

  it("reports unavailable and own_store", async () => {
    const s = await makeStore()
    const hidden = await makeProduct(s.id, { name: "hidden" })
    await add(BUYER, hidden.id, 1)
    await prisma.product.update({ where: { id: hidden.id }, data: { isPublished: false } })
    // 自分のストアの商品はカートに入れられないので直接行を作る
    const own = await makeProduct((await makeStore({ ownerSub: BUYER.sub })).id, { name: "own", stock: 4 })
    await prisma.cartItem.create({ data: { buyerSub: BUYER.sub, productId: own.id, quantity: 1 } })

    const r = await place(BUYER)
    assert.deepEqual(r, {
      ok: false,
      code: "problems",
      problems: [
        { productId: hidden.id, problem: "unavailable", stock: 5 },
        { productId: own.id, problem: "own_store", stock: 4 },
      ],
    })
    assert.equal(await prisma.order.count(), 0)
  })

  it("returns empty_cart", async () => {
    assert.deepEqual(await place(BUYER), { ok: false, code: "empty_cart" })
  })

  it("lets only one of two buyers take the last item", async () => {
    const p = await makeProduct((await makeStore()).id, { stock: 1 })
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

  it("creates one set of orders on a double submit", async () => {
    const p = await makeProduct((await makeStore()).id, { stock: 5 })
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
    const s = await makeStore()
    const a = await makeProduct(s.id, { name: "A", price: 100, stock: 9 })
    const b = await makeProduct(s.id, { name: "B", price: 200, stock: 9 })
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

describe("placeOrder vs deleteStore", () => {
  it("never leaves an open order without a store", async () => {
    for (let round = 0; round < 5; round++) {
      await prisma.order.deleteMany()
      const store = await makeStore()
      const p = await makeProduct(store.id, { stock: 5 })
      await add(BUYER, p.id, 1)
      const [placed, deleted] = await Promise.all([
        place(BUYER),
        deleteStore(deps, store.ownerSub, store.slug),
      ])
      if (deleted.ok) {
        assert.equal(await prisma.order.count({ where: { status: "RECEIVED" } }), 0)
        // 削除が先なら商品はもうない（カート行は CASCADE で消える）
        assert.ok(
          !placed.ok && (placed.code === "empty_cart" || placed.code === "changed"),
        )
      } else {
        assert.deepEqual(deleted, { ok: false, code: "has_open_orders" })
        assert.equal(placed.ok, true)
        assert.equal(await prisma.order.count({ where: { storeId: store.id } }), 1)
      }
    }
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

  it("returns not_found for other stores' orders and malformed ids", async () => {
    const { orderId } = await orderOne()
    const other = await makeStore()
    assert.deepEqual(await changeOrderStatusAsOwner(deps, other.ownerSub, orderId, "PAID"), {
      ok: false,
      code: "not_found",
    })
    assert.deepEqual(await changeOrderStatusAsOwner(deps, "no-store", orderId, "PAID"), {
      ok: false,
      code: "not_found",
    })
    const { store } = await orderOne(OTHER)
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

describe("cancelOrderAsBuyer", () => {
  it("cancels a RECEIVED order and restores stock", async () => {
    const { product, orderId } = await orderOne(BUYER, { stock: 5, qty: 2 })
    assert.deepEqual(await cancelOrderAsBuyer(deps, BUYER.sub, orderId), { ok: true })
    assert.equal(await stockOf(product.id), 5)
    assert.equal((await getBuyerOrder(deps, BUYER.sub, orderId))?.status, "CANCELED")
  })

  it("refuses a PAID order", async () => {
    const { store, product, orderId } = await orderOne()
    await changeOrderStatusAsOwner(deps, store.ownerSub, orderId, "PAID")
    assert.deepEqual(await cancelOrderAsBuyer(deps, BUYER.sub, orderId), { ok: false, code: "invalid_transition" })
    assert.equal(await stockOf(product.id), 3)
  })

  it("returns not_found for other buyers' orders and malformed ids", async () => {
    const { orderId } = await orderOne()
    assert.deepEqual(await cancelOrderAsBuyer(deps, OTHER.sub, orderId), { ok: false, code: "not_found" })
    assert.deepEqual(await cancelOrderAsBuyer(deps, BUYER.sub, "abc"), { ok: false, code: "not_found" })
  })

  it("lets only one of concurrent owner and buyer cancels win and restores stock once", async () => {
    const { store, product, orderId } = await orderOne(BUYER, { stock: 5, qty: 2 })
    const results = await Promise.all([
      changeOrderStatusAsOwner(deps, store.ownerSub, orderId, "CANCELED"),
      cancelOrderAsBuyer(deps, BUYER.sub, orderId),
    ])
    assert.equal(results.filter((r) => r.ok).length, 1)
    assert.deepEqual(
      results.filter((r) => !r.ok),
      [{ ok: false, code: "conflict" }],
    )
    assert.equal(await stockOf(product.id), 5)
  })

  it("keeps items of a deleted product and restores nothing for them", async () => {
    const s = await makeStore()
    const gone = await makeProduct(s.id, { name: "gone", stock: 5 })
    const kept = await makeProduct(s.id, { name: "kept", stock: 5 })
    await add(BUYER, gone.id, 1)
    await add(BUYER, kept.id, 2)
    const r = await place(BUYER)
    if (!r.ok) throw new Error("order failed")
    await prisma.product.delete({ where: { id: gone.id } })

    assert.deepEqual(await cancelOrderAsBuyer(deps, BUYER.sub, r.orderIds[0]), { ok: true })
    const order = await getBuyerOrder(deps, BUYER.sub, r.orderIds[0])
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

  it("lists store orders with an optional status filter and counts RECEIVED", async () => {
    const store = await makeStore()
    const p = await makeProduct(store.id, { stock: 9 })
    const ids: string[] = []
    for (let i = 0; i < 3; i++) {
      await add(BUYER, p.id, 1)
      const r = await place(BUYER)
      if (!r.ok) throw new Error("order failed")
      ids.push(r.orderIds[0])
    }
    await orderOne(OTHER) // 別のストアの注文
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

  it("returns the shipping of the latest order", async () => {
    assert.equal(await getLastShipping(deps, BUYER.sub), null)
    await orderOne()
    const p = await makeProduct((await makeStore()).id)
    await add(BUYER, p.id, 1)
    const latest = { postalCode: "987-6543", prefecture: "大阪府", address: "北区2-2", phone: "0612345678" }
    await place(BUYER, latest)
    assert.deepEqual(await getLastShipping(deps, BUYER.sub), latest)
    assert.equal(await getLastShipping(deps, OTHER.sub), null)
  })
})

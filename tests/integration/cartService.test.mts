import { after, beforeEach, describe, it } from "node:test"
import assert from "node:assert/strict"
import { randomUUID } from "node:crypto"
import { prisma } from "../../lib/prisma"
import { assertResettableDatabase } from "../assertResettableDatabase"
import { MemoryImageStorage } from "../../lib/imageStorage"
import type { StoreDeps } from "../../services/storeService"
import {
  addToCart,
  cartVersion,
  countCartItems,
  getCart,
  lineProblem,
  removeFromCart,
  setCartQuantity,
} from "../../services/cartService"

const BUYER = "buyer-1"
const OTHER = "buyer-2"
let deps: StoreDeps

beforeEach(async () => {
  assertResettableDatabase(process.env.DATABASE_URL)
  await prisma.cartItem.deleteMany()
  await prisma.store.deleteMany()
  deps = { db: prisma, storage: new MemoryImageStorage() }
})

after(async () => {
  await prisma.$disconnect()
})

let seq = 0
async function makeStore(ownerSub = `owner-${++seq}`, isPublished = true, name = "あめ屋") {
  return prisma.store.create({
    data: { ownerSub, slug: `shop-${randomUUID().slice(0, 8)}`, name, isPublished },
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

async function rowCount(buyerSub = BUYER) {
  return prisma.cartItem.count({ where: { buyerSub } })
}

describe("addToCart", () => {
  it("adds a row and sums quantities for the same product", async () => {
    const p = await makeProduct((await makeStore()).id)
    assert.deepEqual(await addToCart(deps, BUYER, p.id, 2), { ok: true })
    assert.equal(await rowCount(), 1)
    assert.deepEqual(await addToCart(deps, BUYER, p.id, "3"), { ok: true })
    assert.equal(await rowCount(), 1)
    assert.equal(await countCartItems(deps, BUYER), 5)
  })

  it("caps 7 + 5 at 10", async () => {
    const p = await makeProduct((await makeStore()).id)
    await addToCart(deps, BUYER, p.id, 7)
    assert.deepEqual(await addToCart(deps, BUYER, p.id, 5), { ok: true })
    assert.equal(await countCartItems(deps, BUYER), 10)
    assert.deepEqual(await addToCart(deps, BUYER, p.id, 1), { ok: true })
    assert.equal(await countCartItems(deps, BUYER), 10)
  })

  it("rejects invalid quantities without changing the cart", async () => {
    const p = await makeProduct((await makeStore()).id)
    for (const q of ["100", "-1", "abc", 0, 11]) {
      assert.deepEqual(await addToCart(deps, BUYER, p.id, q), { ok: false, code: "invalid_quantity" })
    }
    assert.equal(await rowCount(), 0)
  })

  it("returns not_found for unpublished, unpublished-store, missing and malformed ids", async () => {
    const hidden = await makeProduct((await makeStore()).id, { isPublished: false })
    const inClosed = await makeProduct((await makeStore(undefined, false)).id)
    for (const id of [hidden.id, inClosed.id, randomUUID(), "abc"]) {
      assert.deepEqual(await addToCart(deps, BUYER, id, 1), { ok: false, code: "not_found" })
    }
    assert.equal(await rowCount(), 0)
  })

  it("returns own_store for the buyer's own product", async () => {
    const p = await makeProduct((await makeStore(BUYER)).id)
    assert.deepEqual(await addToCart(deps, BUYER, p.id, 1), { ok: false, code: "own_store" })
    assert.equal(await rowCount(), 0)
  })

  it("returns cart_full at the 31st distinct product but still allows increments", async () => {
    const store = await makeStore()
    const products = []
    for (let i = 0; i < 31; i++) products.push(await makeProduct(store.id, { name: `p${i}` }))
    for (let i = 0; i < 30; i++) assert.deepEqual(await addToCart(deps, BUYER, products[i].id, 1), { ok: true })
    assert.deepEqual(await addToCart(deps, BUYER, products[30].id, 1), { ok: false, code: "cart_full" })
    assert.equal(await rowCount(), 30)
    assert.deepEqual(await addToCart(deps, BUYER, products[0].id, 2), { ok: true })
    assert.equal(await countCartItems(deps, BUYER), 32)
  })

  it("survives concurrent adds of the same product", async () => {
    const p = await makeProduct((await makeStore()).id)
    const results = await Promise.all([1, 2, 3, 4].map(() => addToCart(deps, BUYER, p.id, 1)))
    assert.ok(results.every((r) => r.ok))
    assert.equal(await rowCount(), 1)
    assert.equal(await countCartItems(deps, BUYER), 4)
  })
})

describe("getCart", () => {
  it("returns an empty cart", async () => {
    assert.deepEqual(await getCart(deps, BUYER), {
      groups: [],
      total: 0,
      itemCount: 0,
      hasProblems: false,
      version: cartVersion([]),
    })
  })

  it("groups by store in first-added order with totals, image and problems", async () => {
    const s1 = await makeStore(undefined, true, "店1")
    const s2 = await makeStore(undefined, true, "店2")
    const a = await makeProduct(s1.id, { name: "A", price: 100, stock: 9 })
    const b = await makeProduct(s2.id, { name: "B", price: 200, stock: 9 })
    const c = await makeProduct(s1.id, { name: "C", price: 50, stock: 2 })
    const d = await makeProduct(s2.id, { name: "D", price: 10, stock: 9 })
    await prisma.productImage.createMany({
      data: [
        { productId: a.id, path: "a/second.png", sortOrder: 2 },
        { productId: a.id, path: "a/first.png", sortOrder: 1 },
      ],
    })
    await addToCart(deps, BUYER, a.id, 2)
    await addToCart(deps, BUYER, b.id, 1)
    await addToCart(deps, BUYER, c.id, 3) // stock 2 < 3
    await addToCart(deps, BUYER, d.id, 4)
    await prisma.product.update({ where: { id: d.id }, data: { isPublished: false } })

    const cart = await getCart(deps, BUYER)
    assert.deepEqual(cart.groups.map((g) => g.storeName), ["店1", "店2"])
    const [g1, g2] = cart.groups
    assert.deepEqual(g1.lines.map((l) => l.productName), ["A", "C"])
    assert.deepEqual(g2.lines.map((l) => l.productName), ["B", "D"])
    assert.equal(g1.subtotal, 100 * 2 + 50 * 3)
    assert.equal(g2.subtotal, 200 + 10 * 4)
    assert.equal(cart.total, 350 + 240)
    assert.equal(cart.itemCount, 10)
    assert.equal(cart.hasProblems, true)
    assert.equal(g1.lines[0].imageUrl, deps.storage.publicUrl("a/first.png"))
    assert.equal(g1.lines[0].problem, null)
    assert.equal(g1.lines[1].problem, "insufficient_stock")
    assert.equal(g1.lines[1].imageUrl, null)
    assert.equal(g2.lines[1].problem, "unavailable")
    assert.equal(g2.lines[1].unitPrice, 10)
  })

  it("flags unpublished stores as unavailable", async () => {
    const s = await makeStore()
    const p = await makeProduct(s.id)
    await addToCart(deps, BUYER, p.id, 1)
    assert.equal((await getCart(deps, BUYER)).hasProblems, false)
    await prisma.store.update({ where: { id: s.id }, data: { isPublished: false } })
    const cart = await getCart(deps, BUYER)
    assert.equal(cart.groups[0].lines[0].problem, "unavailable")
    assert.equal(cart.hasProblems, true)
  })

  it("reports whether stores and products are published so the page can avoid dead links", async () => {
    const s1 = await makeStore()
    const s2 = await makeStore()
    const a = await makeProduct(s1.id, { name: "A" })
    const b = await makeProduct(s1.id, { name: "B" })
    const c = await makeProduct(s2.id, { name: "C" })
    for (const p of [a, b, c]) await addToCart(deps, BUYER, p.id, 1)
    await prisma.product.update({ where: { id: b.id }, data: { isPublished: false } })
    await prisma.store.update({ where: { id: s2.id }, data: { isPublished: false } })
    const [g1, g2] = (await getCart(deps, BUYER)).groups
    assert.equal(g1.storePublished, true)
    assert.deepEqual(g1.lines.map((l) => l.productPublished), [true, false])
    assert.equal(g2.storePublished, false)
    assert.deepEqual(g2.lines.map((l) => l.productPublished), [true])
  })

  it("does not show other buyers' items", async () => {
    const p = await makeProduct((await makeStore()).id)
    await addToCart(deps, OTHER, p.id, 2)
    assert.equal((await getCart(deps, BUYER)).itemCount, 0)
    assert.equal(await countCartItems(deps, BUYER), 0)
  })
})

describe("cartVersion", () => {
  it("hashes item, quantity and price regardless of order", () => {
    const x = { itemId: "x", quantity: 1, unitPrice: 100 }
    const y = { itemId: "y", quantity: 2, unitPrice: 200 }
    assert.match(cartVersion([x, y]), /^[0-9a-f]{64}$/)
    assert.equal(cartVersion([x, y]), cartVersion([y, x]))
    assert.notEqual(cartVersion([x, y]), cartVersion([x]))
    assert.notEqual(cartVersion([x, y]), cartVersion([x, { ...y, quantity: 3 }]))
    assert.notEqual(cartVersion([x, y]), cartVersion([x, { ...y, unitPrice: 201 }]))
  })

  it("changes in getCart with quantity and price but not with stock", async () => {
    const p = await makeProduct((await makeStore()).id)
    await addToCart(deps, BUYER, p.id, 1)
    const v1 = (await getCart(deps, BUYER)).version
    await prisma.product.update({ where: { id: p.id }, data: { stock: 4 } })
    assert.equal((await getCart(deps, BUYER)).version, v1)
    await prisma.product.update({ where: { id: p.id }, data: { price: 301 } })
    const v2 = (await getCart(deps, BUYER)).version
    assert.notEqual(v2, v1)
    await addToCart(deps, BUYER, p.id, 1)
    assert.notEqual((await getCart(deps, BUYER)).version, v2)
  })
})

describe("lineProblem", () => {
  const base = { isPublished: true, stock: 3, store: { isPublished: true, ownerSub: "o" } }
  it("applies precedence own_store > unavailable > insufficient_stock", () => {
    assert.equal(lineProblem(base, 3, "b"), null)
    assert.equal(lineProblem(base, 4, "b"), "insufficient_stock")
    assert.equal(lineProblem({ ...base, isPublished: false }, 4, "b"), "unavailable")
    assert.equal(lineProblem({ ...base, store: { isPublished: false, ownerSub: "o" } }, 1, "b"), "unavailable")
    assert.equal(lineProblem({ ...base, isPublished: false }, 4, "o"), "own_store")
  })
})

describe("setCartQuantity / removeFromCart", () => {
  async function seed() {
    const p = await makeProduct((await makeStore()).id)
    await addToCart(deps, BUYER, p.id, 2)
    return prisma.cartItem.findFirstOrThrow({ where: { buyerSub: BUYER } })
  }

  it("updates own rows and rejects invalid quantities", async () => {
    const item = await seed()
    assert.equal(await setCartQuantity(deps, BUYER, item.id, "7"), true)
    assert.equal(await countCartItems(deps, BUYER), 7)
    assert.equal(await setCartQuantity(deps, BUYER, item.id, "11"), false)
    assert.equal(await setCartQuantity(deps, BUYER, item.id, 0), false)
    assert.equal(await countCartItems(deps, BUYER), 7)
  })

  it("refuses other buyers' rows and malformed ids", async () => {
    const item = await seed()
    assert.equal(await setCartQuantity(deps, OTHER, item.id, 5), false)
    assert.equal(await setCartQuantity(deps, BUYER, "abc", 5), false)
    assert.equal(await removeFromCart(deps, OTHER, item.id), false)
    assert.equal(await removeFromCart(deps, BUYER, "abc"), false)
    assert.equal(await removeFromCart(deps, BUYER, randomUUID()), false)
    assert.equal(await countCartItems(deps, BUYER), 2)
  })

  // placeOrder と同じ購入者ごとのロックを取る。ロック中の書き込みは解放まで待つ
  async function whileCartLocked(write: () => Promise<boolean>) {
    let release!: () => void
    const held = new Promise<void>((r) => (release = r))
    let locked!: () => void
    const acquired = new Promise<void>((r) => (locked = r))
    const tx = prisma.$transaction(async (t) => {
      await t.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${"cart:" + BUYER}))`
      locked()
      await held
    })
    await acquired
    let done = false
    const pending = write().then((r) => ((done = true), r))
    await new Promise((r) => setTimeout(r, 300))
    const doneWhileLocked = done
    release()
    await tx
    return { doneWhileLocked, result: await pending }
  }

  it("waits for the cart lock when changing a quantity", async () => {
    const item = await seed()
    const { doneWhileLocked, result } = await whileCartLocked(() => setCartQuantity(deps, BUYER, item.id, 4))
    assert.equal(doneWhileLocked, false)
    assert.equal(result, true)
    assert.equal(await countCartItems(deps, BUYER), 4)
  })

  it("waits for the cart lock when removing", async () => {
    const item = await seed()
    const { doneWhileLocked, result } = await whileCartLocked(() => removeFromCart(deps, BUYER, item.id))
    assert.equal(doneWhileLocked, false)
    assert.equal(result, true)
    assert.equal(await rowCount(), 0)
  })

  it("removes own rows", async () => {
    const item = await seed()
    assert.equal(await removeFromCart(deps, BUYER, item.id), true)
    assert.equal(await rowCount(), 0)
  })
})

describe("product deletion", () => {
  it("removes cart rows when the product is deleted", async () => {
    const p = await makeProduct((await makeStore()).id)
    await addToCart(deps, BUYER, p.id, 1)
    await prisma.product.delete({ where: { id: p.id } })
    assert.equal(await rowCount(), 0)
  })
})

import { after, beforeEach, describe, it } from "node:test"
import assert from "node:assert/strict"
import { randomUUID } from "node:crypto"
import { prisma } from "../../lib/prisma"
import { assertResettableDatabase } from "../assertResettableDatabase"
import { MemoryImageStorage } from "../../lib/imageStorage"
import type { StoreDeps } from "../../services/deps"
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
  await prisma.product.deleteMany()
  await prisma.storeSettings.deleteMany()
  deps = { db: prisma, storage: new MemoryImageStorage() }
})

after(async () => {
  await prisma.$disconnect()
})

// サイトのお店（1 つだけ）
async function makeStore(ownerSub = "owner", isPublished = true, name = "あめ屋") {
  return prisma.storeSettings.create({ data: { ownerSub, name, isPublished } })
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

// Cart lines are shown oldest first. Rows added in the same millisecond would tie on createdAt
// and fall back to random ids, so give each line a distinct createdAt in the order given.
async function pinCartOrder(buyerSub: string, productIds: string[]) {
  const base = Date.UTC(2026, 0, 1)
  for (const [i, productId] of productIds.entries()) {
    await prisma.cartItem.updateMany({ where: { buyerSub, productId }, data: { createdAt: new Date(base + i * 1000) } })
  }
}

async function rowCount(buyerSub = BUYER) {
  return prisma.cartItem.count({ where: { buyerSub } })
}

describe("addToCart", () => {
  it("adds a row and sums quantities for the same product", async () => {
    await makeStore()
    const p = await makeProduct()
    assert.deepEqual(await addToCart(deps, BUYER, p.id, 2), { ok: true })
    assert.equal(await rowCount(), 1)
    assert.deepEqual(await addToCart(deps, BUYER, p.id, "3"), { ok: true })
    assert.equal(await rowCount(), 1)
    assert.equal(await countCartItems(deps, BUYER), 5)
  })

  it("caps 7 + 5 at 10 and reports capped when nothing more was added", async () => {
    await makeStore()
    const p = await makeProduct({ stock: 20 })
    await addToCart(deps, BUYER, p.id, 7)
    assert.deepEqual(await addToCart(deps, BUYER, p.id, 5), { ok: true })
    assert.equal(await countCartItems(deps, BUYER), 10)
    assert.deepEqual(await addToCart(deps, BUYER, p.id, 1), { ok: true, capped: true })
    assert.equal(await countCartItems(deps, BUYER), 10)
  })

  it("refuses to go over the stock and reports how many more fit", async () => {
    await makeStore()
    const p = await makeProduct({ stock: 3 })
    assert.deepEqual(await addToCart(deps, BUYER, p.id, 4), {
      ok: false,
      code: "insufficient_stock",
      inCart: 0,
      available: 3,
    })
    assert.equal(await rowCount(), 0)
    assert.deepEqual(await addToCart(deps, BUYER, p.id, 2), { ok: true })
    assert.deepEqual(await addToCart(deps, BUYER, p.id, 2), {
      ok: false,
      code: "insufficient_stock",
      inCart: 2,
      available: 1,
    })
    assert.deepEqual(await addToCart(deps, BUYER, p.id, 1), { ok: true })
    assert.deepEqual(await addToCart(deps, BUYER, p.id, 1), {
      ok: false,
      code: "insufficient_stock",
      inCart: 3,
      available: 0,
    })
    assert.equal(await countCartItems(deps, BUYER), 3)
  })

  it("lets only the stock's worth of concurrent adds in", async () => {
    await makeStore()
    const p = await makeProduct({ stock: 2 })
    const results = await Promise.all([1, 2, 3].map(() => addToCart(deps, BUYER, p.id, 1)))
    assert.equal(results.filter((r) => r.ok).length, 2)
    assert.equal(await countCartItems(deps, BUYER), 2)
  })

  it("rejects invalid quantities without changing the cart", async () => {
    await makeStore()
    const p = await makeProduct()
    for (const q of ["100", "-1", "abc", 0, 11]) {
      assert.deepEqual(await addToCart(deps, BUYER, p.id, q), { ok: false, code: "invalid_quantity" })
    }
    assert.equal(await rowCount(), 0)
  })

  it("returns not_found for unpublished, missing and malformed ids", async () => {
    await makeStore()
    const hidden = await makeProduct({ isPublished: false })
    for (const id of [hidden.id, randomUUID(), "abc"]) {
      assert.deepEqual(await addToCart(deps, BUYER, id, 1), { ok: false, code: "not_found" })
    }
    assert.equal(await rowCount(), 0)
  })

  it("returns not_found while the store is missing or unpublished", async () => {
    const p = await makeProduct()
    assert.deepEqual(await addToCart(deps, BUYER, p.id, 1), { ok: false, code: "not_found" })
    await makeStore(undefined, false)
    assert.deepEqual(await addToCart(deps, BUYER, p.id, 1), { ok: false, code: "not_found" })
    assert.equal(await rowCount(), 0)
  })

  it("returns own_store for the buyer's own product", async () => {
    await makeStore(BUYER)
    const p = await makeProduct()
    assert.deepEqual(await addToCart(deps, BUYER, p.id, 1), { ok: false, code: "own_store" })
    assert.equal(await rowCount(), 0)
  })

  it("returns cart_full at the 31st distinct product but still allows increments", async () => {
    await makeStore()
    const products = []
    for (let i = 0; i < 31; i++) products.push(await makeProduct({ name: `p${i}` }))
    for (let i = 0; i < 30; i++) assert.deepEqual(await addToCart(deps, BUYER, products[i].id, 1), { ok: true })
    assert.deepEqual(await addToCart(deps, BUYER, products[30].id, 1), { ok: false, code: "cart_full" })
    assert.equal(await rowCount(), 30)
    assert.deepEqual(await addToCart(deps, BUYER, products[0].id, 2), { ok: true })
    assert.equal(await countCartItems(deps, BUYER), 32)
  })

  it("survives concurrent adds of the same product", async () => {
    await makeStore()
    const p = await makeProduct()
    const results = await Promise.all([1, 2, 3, 4].map(() => addToCart(deps, BUYER, p.id, 1)))
    assert.ok(results.every((r) => r.ok))
    assert.equal(await rowCount(), 1)
    assert.equal(await countCartItems(deps, BUYER), 4)
  })
})

describe("getCart", () => {
  it("returns an empty cart", async () => {
    assert.deepEqual(await getCart(deps, BUYER), {
      store: null,
      lines: [],
      total: 0,
      itemCount: 0,
      hasProblems: false,
      version: cartVersion([]),
    })
  })

  it("lists lines in first-added order with the store, totals, image and problems", async () => {
    await prisma.storeSettings.create({
      data: { ownerSub: "owner", name: "店1", isPublished: true, paymentInstructions: "振込" },
    })
    const a = await makeProduct({ name: "A", price: 100, stock: 9 })
    const b = await makeProduct({ name: "B", price: 200, stock: 9 })
    const c = await makeProduct({ name: "C", price: 50, stock: 2 })
    await prisma.productImage.createMany({
      data: [
        { productId: a.id, path: "a/second.png", sortOrder: 2 },
        { productId: a.id, path: "a/first.png", sortOrder: 1 },
      ],
    })
    await addToCart(deps, BUYER, a.id, 2)
    await addToCart(deps, BUYER, b.id, 1)
    await addToCart(deps, BUYER, c.id, 2)
    await pinCartOrder(BUYER, [a.id, b.id, c.id])
    await prisma.cartItem.updateMany({ where: { productId: c.id }, data: { quantity: 3 } }) // stock 2 < 3
    await prisma.product.update({ where: { id: b.id }, data: { isPublished: false } })

    const cart = await getCart(deps, BUYER)
    assert.deepEqual(cart.store, { name: "店1", isPublished: true, paymentInstructions: "振込" })
    assert.deepEqual(cart.lines.map((l) => l.productName), ["A", "B", "C"])
    assert.equal(cart.total, 100 * 2 + 200 + 50 * 3)
    assert.equal(cart.itemCount, 6)
    assert.equal(cart.hasProblems, true)
    assert.equal(cart.lines[0].imageUrl, deps.storage.publicUrl("a/first.png"))
    assert.equal(cart.lines[0].problem, null)
    assert.equal(cart.lines[1].problem, "unavailable")
    assert.equal(cart.lines[1].productPublished, false)
    assert.equal(cart.lines[1].unitPrice, 200)
    assert.equal(cart.lines[2].problem, "insufficient_stock")
    assert.equal(cart.lines[2].imageUrl, null)
  })

  it("flags every line as unavailable while the store is unpublished", async () => {
    await makeStore()
    const p = await makeProduct()
    await addToCart(deps, BUYER, p.id, 1)
    assert.equal((await getCart(deps, BUYER)).hasProblems, false)
    await prisma.storeSettings.updateMany({ data: { isPublished: false } })
    const cart = await getCart(deps, BUYER)
    assert.equal(cart.store?.isPublished, false)
    assert.equal(cart.lines[0].problem, "unavailable")
    assert.equal(cart.hasProblems, true)
  })

  it("does not show other buyers' items", async () => {
    await makeStore()
    const p = await makeProduct()
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
    await makeStore()
    const p = await makeProduct()
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
  const base = { isPublished: true, stock: 3 }
  const store = { isPublished: true, ownerSub: "o" }
  it("applies precedence own_store > unavailable > insufficient_stock", () => {
    assert.equal(lineProblem(base, store, 3, "b"), null)
    assert.equal(lineProblem(base, store, 4, "b"), "insufficient_stock")
    assert.equal(lineProblem({ ...base, isPublished: false }, store, 4, "b"), "unavailable")
    assert.equal(lineProblem(base, { ...store, isPublished: false }, 1, "b"), "unavailable")
    assert.equal(lineProblem(base, null, 1, "b"), "unavailable")
    assert.equal(lineProblem({ ...base, isPublished: false }, store, 4, "o"), "own_store")
  })
})

describe("setCartQuantity / removeFromCart", () => {
  async function seed() {
    await makeStore()
    const p = await makeProduct({ stock: 9 })
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

  it("refuses to raise the quantity over the stock but allows lowering it", async () => {
    const item = await seed()
    assert.equal(await setCartQuantity(deps, BUYER, item.id, 10), false)
    assert.equal(await countCartItems(deps, BUYER), 2)
    assert.equal(await setCartQuantity(deps, BUYER, item.id, 9), true)
    await prisma.product.update({ where: { id: item.productId }, data: { stock: 4 } })
    assert.equal(await setCartQuantity(deps, BUYER, item.id, 6), true) // 9 → 6: still over, but lower
    assert.equal(await setCartQuantity(deps, BUYER, item.id, 7), false)
    assert.equal(await countCartItems(deps, BUYER), 6)
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
    await makeStore()
    const p = await makeProduct()
    await addToCart(deps, BUYER, p.id, 1)
    await prisma.product.delete({ where: { id: p.id } })
    assert.equal(await rowCount(), 0)
  })
})

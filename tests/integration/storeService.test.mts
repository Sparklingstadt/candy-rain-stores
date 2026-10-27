import { after, beforeEach, describe, it } from "node:test"
import assert from "node:assert/strict"
import { prisma } from "../../lib/prisma"
import { assertResettableDatabase } from "../assertResettableDatabase"
import { MemoryImageStorage } from "../../lib/imageStorage"
import { addProductImage, createProduct } from "../../services/productService"
import {
  createStore,
  deleteStore,
  getOwnStore,
  getStoreForViewer,
  listPublishedStores,
  setPublished,
  updateStore,
  type StoreDeps,
} from "../../services/storeService"

const fields = { name: "あめ屋", description: "かわいい", themeColor: "#112233" }
const png = (n = 1) => ({
  contentType: "image/png" as const,
  ext: "png" as const,
  bytes: new Uint8Array([0x89, 0x50, 0x4e, 0x47, n]),
})

let storage: MemoryImageStorage
let deps: StoreDeps

beforeEach(async () => {
  assertResettableDatabase(process.env.DATABASE_URL)
  await prisma.order.deleteMany()
  await prisma.store.deleteMany()
  storage = new MemoryImageStorage()
  deps = { db: prisma, storage }
})

after(async () => {
  await prisma.$disconnect()
})

async function create(ownerSub: string, slug: string, logo = null as ReturnType<typeof png> | null) {
  const r = await createStore(deps, ownerSub, { slug, fields, logo, header: null })
  assert.equal(r.ok, true)
  if (!r.ok) throw new Error("unreachable")
  return r.store
}

describe("createStore", () => {
  it("creates an unpublished store, saves fields and the logo", async () => {
    const store = await create("a", "shop-a", png())
    assert.equal(store.isPublished, false)
    assert.equal(store.themeColor, "#112233")
    assert.equal(store.name, "あめ屋")
    assert.match(store.logoPath ?? "", new RegExp(`^${store.id}/logo-.+\\.png$`))
    assert.ok(storage.files.has(store.logoPath!))
    assert.equal(store.logoUrl, `memory://store-images/${store.logoPath}`)
    assert.equal(store.headerUrl, null)
  })

  it("rejects a second store for the same owner", async () => {
    await create("a", "shop-a")
    const r = await createStore(deps, "a", { slug: "shop-b", fields, logo: png(), header: null })
    assert.deepEqual(r, { ok: false, code: "already_has_store" })
    assert.equal(storage.files.size, 0)
  })

  it("lets only one of two concurrent creates succeed", async () => {
    const results = await Promise.all([
      createStore(deps, "a", { slug: "shop-a", fields, logo: png(), header: null }),
      createStore(deps, "a", { slug: "shop-b", fields, logo: png(), header: null }),
    ])
    assert.equal(results.filter((r) => r.ok).length, 1)
    assert.deepEqual(results.find((r) => !r.ok), { ok: false, code: "already_has_store" })
    assert.equal(await prisma.store.count(), 1)
    assert.equal(storage.files.size, 1)
  })

  it("reports a taken slug and leaves no uploaded image", async () => {
    await create("a", "shop-a")
    const r = await createStore(deps, "b", { slug: "shop-a", fields, logo: png(), header: png(2) })
    assert.deepEqual(r, {
      ok: false,
      code: "invalid",
      errors: { slug: "このストア ID はすでに使われています" },
    })
    assert.equal(storage.files.size, 0)
  })

  it("rejects a malformed slug", async () => {
    const r = await createStore(deps, "a", { slug: "A", fields, logo: null, header: null })
    assert.equal(r.ok, false)
    if (!r.ok) assert.equal(r.code, "invalid")
    assert.equal(await prisma.store.count(), 0)
  })
})

describe("updateStore", () => {
  const upd = { fields: { ...fields, name: "新しい名前" }, logo: null, header: null, removeLogo: false, removeHeader: false }

  it("changes only the caller's store", async () => {
    const a = await create("a", "shop-a")
    assert.deepEqual(await updateStore(deps, "b", upd), { ok: false, code: "not_found" })
    await create("b", "shop-b")
    const r = await updateStore(deps, "b", upd)
    assert.equal(r.ok, true)
    const after = await prisma.store.findUniqueOrThrow({ where: { id: a.id } })
    assert.equal(after.name, "あめ屋")
  })

  it("replaces the logo and removes the old file", async () => {
    const a = await create("a", "shop-a", png(1))
    const r = await updateStore(deps, "a", { ...upd, logo: png(2) })
    assert.equal(r.ok, true)
    if (!r.ok) return
    assert.notEqual(r.store.logoPath, a.logoPath)
    assert.deepEqual([...storage.files.keys()], [r.store.logoPath])
  })

  it("removes the logo with removeLogo", async () => {
    await create("a", "shop-a", png())
    const r = await updateStore(deps, "a", { ...upd, removeLogo: true })
    assert.equal(r.ok, true)
    if (!r.ok) return
    assert.equal(r.store.logoPath, null)
    assert.equal(r.store.logoUrl, null)
    assert.equal(storage.files.size, 0)
  })

  it("throws and leaves the database untouched when upload fails", async () => {
    const a = await create("a", "shop-a", png(1))
    storage.failNextPut = true
    await assert.rejects(updateStore(deps, "a", { ...upd, logo: png(2) }))
    const row = await prisma.store.findUniqueOrThrow({ where: { id: a.id } })
    assert.equal(row.name, "あめ屋")
    assert.equal(row.logoPath, a.logoPath)
    assert.deepEqual([...storage.files.keys()], [a.logoPath])
  })
})

describe("getStoreForViewer / setPublished / getOwnStore", () => {
  it("hides unpublished stores from others and previews for the owner", async () => {
    await create("a", "shop-a")
    assert.equal(await getStoreForViewer(deps, "shop-a", null), null)
    assert.equal(await getStoreForViewer(deps, "shop-a", "b"), null)
    const owner = await getStoreForViewer(deps, "shop-a", "a")
    assert.equal(owner?.isOwnerPreview, true)
    assert.equal(owner?.store.slug, "shop-a")
  })

  it("serves published stores to everyone", async () => {
    await create("a", "shop-a")
    const p = await setPublished(deps, "a", true)
    assert.equal(p?.isPublished, true)
    for (const viewer of [null, "b", "a"]) {
      const v = await getStoreForViewer(deps, "shop-a", viewer)
      assert.equal(v?.isOwnerPreview, false)
    }
  })

  it("returns null for unknown slugs and users without a store", async () => {
    assert.equal(await getStoreForViewer(deps, "nope", "a"), null)
    assert.equal(await setPublished(deps, "a", true), null)
    assert.equal(await getOwnStore(deps, "a"), null)
    await create("a", "shop-a")
    assert.equal((await getOwnStore(deps, "a"))?.slug, "shop-a")
  })
})

describe("deleteStore", () => {
  it("keeps the store when the confirmation differs", async () => {
    await create("a", "shop-a", png())
    assert.deepEqual(await deleteStore(deps, "a", "other"), { ok: false, code: "confirm_mismatch" })
    assert.equal(await prisma.store.count(), 1)
    assert.equal(storage.files.size, 1)
  })

  it("returns not_found without a store", async () => {
    assert.deepEqual(await deleteStore(deps, "a", "shop-a"), { ok: false, code: "not_found" })
  })

  it("deletes the row and images, freeing the slug", async () => {
    await create("a", "shop-a", png())
    assert.deepEqual(await deleteStore(deps, "a", " SHOP-A "), { ok: true })
    assert.equal(await prisma.store.count(), 0)
    assert.equal(storage.files.size, 0)
    const r = await createStore(deps, "b", { slug: "shop-a", fields, logo: null, header: null })
    assert.equal(r.ok, true)
  })
})

describe("deleteStore with products", () => {
  it("removes products, product images and all files", async () => {
    await create("a", "shop-a", png())
    for (const name of ["one", "two"]) {
      const r = await createProduct(deps, "a", { name, description: "", price: 100, stock: 1 })
      assert.equal(r.ok, true)
      if (!r.ok) throw new Error("unreachable")
      assert.equal((await addProductImage(deps, "a", r.product.id, png(2))).ok, true)
      assert.equal((await addProductImage(deps, "a", r.product.id, png(3))).ok, true)
    }
    assert.equal(storage.files.size, 5)
    assert.deepEqual(await deleteStore(deps, "a", "shop-a"), { ok: true })
    assert.equal(await prisma.product.count(), 0)
    assert.equal(await prisma.productImage.count(), 0)
    assert.equal(storage.files.size, 0)
  })
})

describe("deleteStore with orders", () => {
  async function makeOrder(storeId: string, status: "RECEIVED" | "PAID" | "SHIPPED" | "CANCELED") {
    return prisma.order.create({
      data: {
        storeId,
        storeName: "あめ屋",
        buyerSub: "buyer",
        buyerName: "あめ子",
        buyerEmail: "ameko@example.com",
        postalCode: "123-4567",
        prefecture: "東京都",
        address: "千代田区1-1",
        phone: "03-1234-5678",
        status,
        totalAmount: 300,
      },
    })
  }

  for (const status of ["RECEIVED", "PAID"] as const) {
    it(`refuses while a ${status} order is open and keeps the store`, async () => {
      const store = await create("a", "shop-a", png())
      await makeOrder(store.id, "SHIPPED")
      await makeOrder(store.id, status)
      assert.deepEqual(await deleteStore(deps, "a", "other"), { ok: false, code: "confirm_mismatch" })
      assert.deepEqual(await deleteStore(deps, "a", "shop-a"), { ok: false, code: "has_open_orders" })
      assert.equal(await prisma.store.count(), 1)
      assert.equal(storage.files.size, 1)
    })
  }

  it("deletes a store whose orders are all closed and keeps the orders with storeId null", async () => {
    const store = await create("a", "shop-a")
    const shipped = await makeOrder(store.id, "SHIPPED")
    const canceled = await makeOrder(store.id, "CANCELED")
    assert.deepEqual(await deleteStore(deps, "a", "shop-a"), { ok: true })
    assert.equal(await prisma.store.count(), 0)
    for (const o of [shipped, canceled]) {
      const row = await prisma.order.findUniqueOrThrow({ where: { id: o.id } })
      assert.equal(row.storeId, null)
      assert.equal(row.storeName, "あめ屋")
    }
    await prisma.order.deleteMany()
  })
})

describe("listPublishedStores", () => {
  async function seed(n: number, opts: { published?: boolean; ownerPrefix?: string } = {}) {
    const base = Date.UTC(2026, 0, 1)
    for (let i = 0; i < n; i++) {
      await prisma.store.create({
        data: {
          ownerSub: `${opts.ownerPrefix ?? "o"}-${i}`,
          slug: `${opts.ownerPrefix ?? "o"}-${String(i).padStart(2, "0")}`,
          name: `ストア${i}`,
          isPublished: opts.published ?? true,
          createdAt: new Date(base + i * 1000),
        },
      })
    }
  }

  it("lists only published stores, newest first, with image URLs resolved like StoreView", async () => {
    const a = await create("a", "shop-a", png())
    const b = await create("b", "shop-b")
    await create("c", "shop-c")
    await setPublished(deps, "a", true)
    await setPublished(deps, "b", true)
    const r = await listPublishedStores(deps, 1, 24)
    assert.deepEqual(r.stores.map((s) => s.slug), ["shop-b", "shop-a"])
    assert.equal(r.hasNext, false)
    const card = r.stores[1]
    assert.equal(card.id, a.id)
    assert.equal(card.name, "あめ屋")
    assert.equal(card.description, "かわいい")
    assert.equal(card.themeColor, "#112233")
    assert.equal(card.logoUrl, `memory://store-images/${a.logoPath}`)
    assert.equal(card.headerUrl, null)
    assert.equal(r.stores[0].id, b.id)
    assert.equal(r.stores[0].logoUrl, null)
  })

  it("breaks createdAt ties by id descending", async () => {
    const at = new Date(Date.UTC(2026, 0, 1))
    const ids = ["00000000-0000-4000-8000-000000000001", "00000000-0000-4000-8000-000000000003", "00000000-0000-4000-8000-000000000002"]
    for (const [i, id] of ids.entries()) {
      await prisma.store.create({ data: { id, ownerSub: `t${i}`, slug: `tie-${i}`, name: "t", isPublished: true, createdAt: at } })
    }
    const r = await listPublishedStores(deps, 1, 24)
    assert.deepEqual(r.stores.map((s) => s.id), [...ids].sort().reverse())
  })

  it("pages and reports hasNext", async () => {
    await seed(5)
    const p1 = await listPublishedStores(deps, 1, 2)
    assert.deepEqual(p1.stores.map((s) => s.name), ["ストア4", "ストア3"])
    assert.equal(p1.hasNext, true)
    const p2 = await listPublishedStores(deps, 2, 2)
    assert.deepEqual(p2.stores.map((s) => s.name), ["ストア2", "ストア1"])
    assert.equal(p2.hasNext, true)
    const p3 = await listPublishedStores(deps, 3, 2)
    assert.deepEqual(p3.stores.map((s) => s.name), ["ストア0"])
    assert.equal(p3.hasNext, false)
    const p4 = await listPublishedStores(deps, 4, 2)
    assert.deepEqual(p4, { stores: [], hasNext: false })
  })

  it("hasNext is false when the last page is exactly full", async () => {
    await seed(4)
    const p2 = await listPublishedStores(deps, 2, 2)
    assert.equal(p2.stores.length, 2)
    assert.equal(p2.hasNext, false)
  })

  it("returns nothing when no store is published", async () => {
    await seed(2, { published: false })
    assert.deepEqual(await listPublishedStores(deps, 1, 24), { stores: [], hasNext: false })
  })

  it("counts published products of each store only", async () => {
    const a = await create("a", "shop-a")
    const b = await create("b", "shop-b")
    await setPublished(deps, "a", true)
    await setPublished(deps, "b", true)
    const product = (storeId: string, name: string, isPublished: boolean) =>
      prisma.product.create({ data: { storeId, name, price: 100, stock: 1, isPublished } })
    await product(a.id, "p1", true)
    await product(a.id, "p2", true)
    await product(a.id, "p3", false)
    await product(b.id, "q1", false)
    const r = await listPublishedStores(deps, 1, 24)
    const counts = Object.fromEntries(r.stores.map((s) => [s.slug, s.publishedProductCount]))
    assert.deepEqual(counts, { "shop-a": 2, "shop-b": 0 })
  })
})

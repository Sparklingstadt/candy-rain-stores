import { after, beforeEach, describe, it } from "node:test"
import assert from "node:assert/strict"
import { randomUUID } from "node:crypto"
import { prisma } from "../../lib/prisma"
import { assertResettableDatabase } from "../assertResettableDatabase"
import { MemoryImageStorage } from "../../lib/imageStorage"
import { createStore, setPublished, type StoreDeps } from "../../services/storeService"
import {
  createProduct,
  deleteProduct,
  getOwnProduct,
  getProductForViewer,
  isUuid,
  listOwnProducts,
  listProductsForStorePage,
  setProductPublished,
  updateProduct,
} from "../../services/productService"

const storeFields = { name: "あめ屋", description: "かわいい", themeColor: "#112233" }
const fields = { name: "いちご飴", description: "甘い", price: 300, stock: 5 }

let deps: StoreDeps

beforeEach(async () => {
  assertResettableDatabase(process.env.DATABASE_URL)
  await prisma.store.deleteMany()
  deps = { db: prisma, storage: new MemoryImageStorage() }
})

after(async () => {
  await prisma.$disconnect()
})

async function makeStore(ownerSub: string, slug: string, publish = false) {
  const r = await createStore(deps, ownerSub, { slug, fields: storeFields, logo: null, header: null })
  assert.equal(r.ok, true)
  if (!r.ok) throw new Error("unreachable")
  if (publish) await setPublished(deps, ownerSub, true)
  return r.store
}

async function makeProduct(ownerSub: string, name = fields.name) {
  const r = await createProduct(deps, ownerSub, { ...fields, name })
  assert.equal(r.ok, true)
  if (!r.ok) throw new Error("unreachable")
  return r.product
}

describe("isUuid", () => {
  it("accepts UUIDs case-insensitively and rejects others", () => {
    assert.equal(isUuid(randomUUID()), true)
    assert.equal(isUuid(randomUUID().toUpperCase()), true)
    assert.equal(isUuid("abc"), false)
    assert.equal(isUuid(""), false)
  })
})

describe("createProduct / listOwnProducts", () => {
  it("creates an unpublished product and lists newest first", async () => {
    await makeStore("a", "shop-a")
    const p1 = await makeProduct("a", "one")
    assert.equal(p1.isPublished, false)
    assert.deepEqual(p1.images, [])
    await makeProduct("a", "two")
    const list = await listOwnProducts(deps, "a")
    assert.deepEqual(list?.map((p) => p.name), ["two", "one"])
  })

  it("returns no_store / null without a store", async () => {
    assert.deepEqual(await createProduct(deps, "x", fields), { ok: false, code: "no_store" })
    assert.equal(await listOwnProducts(deps, "x"), null)
  })

  it("rejects the 101st product", async () => {
    const store = await makeStore("a", "shop-a")
    await prisma.product.createMany({
      data: Array.from({ length: 100 }, (_, i) => ({ storeId: store.id, ...fields, name: `p${i}` })),
    })
    assert.deepEqual(await createProduct(deps, "a", fields), { ok: false, code: "limit_reached" })
  })

  it("allows only one of two concurrent creates at 99 products", async () => {
    const store = await makeStore("a", "shop-a")
    await prisma.product.createMany({
      data: Array.from({ length: 99 }, (_, i) => ({ storeId: store.id, ...fields, name: `p${i}` })),
    })
    const results = await Promise.all([createProduct(deps, "a", fields), createProduct(deps, "a", fields)])
    assert.equal(results.filter((r) => r.ok).length, 1)
    assert.deepEqual(
      results.filter((r) => !r.ok),
      [{ ok: false, code: "limit_reached" }],
    )
    assert.equal(await prisma.product.count({ where: { storeId: store.id } }), 100)
  })
})

describe("owner scoping", () => {
  it("does not let another owner touch the product", async () => {
    await makeStore("a", "shop-a")
    await makeStore("b", "shop-b")
    const p = await makeProduct("a")
    assert.equal(await getOwnProduct(deps, "b", p.id), null)
    assert.equal(await updateProduct(deps, "b", p.id, { ...fields, name: "hack" }), null)
    assert.equal(await setProductPublished(deps, "b", p.id, true), null)
    assert.equal(await deleteProduct(deps, "b", p.id), false)
    const after = await getOwnProduct(deps, "a", p.id)
    assert.equal(after?.name, fields.name)
    assert.equal(after?.isPublished, false)
  })

  it("lets the owner update, publish and delete", async () => {
    await makeStore("a", "shop-a")
    const p = await makeProduct("a")
    const u = await updateProduct(deps, "a", p.id, { ...fields, name: "new", price: 500 })
    assert.equal(u?.name, "new")
    assert.equal(u?.price, 500)
    const pub = await setProductPublished(deps, "a", p.id, true)
    assert.equal(pub?.isPublished, true)
    assert.equal(await deleteProduct(deps, "a", p.id), true)
    assert.equal(await getOwnProduct(deps, "a", p.id), null)
    assert.equal(await deleteProduct(deps, "a", p.id), false)
  })

  it("handles non-UUID ids without throwing", async () => {
    await makeStore("a", "shop-a")
    assert.equal(await getOwnProduct(deps, "a", "abc"), null)
    assert.equal(await updateProduct(deps, "a", "abc", fields), null)
    assert.equal(await setProductPublished(deps, "a", "abc", true), null)
    assert.equal(await deleteProduct(deps, "a", "abc"), false)
    assert.equal(await getProductForViewer(deps, "shop-a", "abc", "a"), null)
  })
})

describe("getProductForViewer", () => {
  it("returns published products of published stores to anyone", async () => {
    await makeStore("a", "shop-a", true)
    const p = await makeProduct("a")
    await setProductPublished(deps, "a", p.id, true)
    for (const viewer of [null, "b", "a"]) {
      const r = await getProductForViewer(deps, "shop-a", p.id, viewer)
      assert.equal(r?.product.id, p.id)
      assert.equal(r?.isOwnerPreview, false)
    }
  })

  it("hides unpublished products from non-owners", async () => {
    await makeStore("a", "shop-a", true)
    const p = await makeProduct("a")
    assert.equal(await getProductForViewer(deps, "shop-a", p.id, null), null)
    assert.equal(await getProductForViewer(deps, "shop-a", p.id, "b"), null)
    const r = await getProductForViewer(deps, "shop-a", p.id, "a")
    assert.equal(r?.isOwnerPreview, true)
  })

  it("hides products of an unpublished store from non-owners", async () => {
    await makeStore("a", "shop-a")
    const p = await makeProduct("a")
    await setProductPublished(deps, "a", p.id, true)
    assert.equal(await getProductForViewer(deps, "shop-a", p.id, null), null)
    assert.equal(await getProductForViewer(deps, "shop-a", p.id, "b"), null)
    assert.equal((await getProductForViewer(deps, "shop-a", p.id, "a"))?.isOwnerPreview, true)
  })

  it("returns null for another store's product or a missing id", async () => {
    await makeStore("a", "shop-a", true)
    await makeStore("b", "shop-b", true)
    const p = await makeProduct("a")
    await setProductPublished(deps, "a", p.id, true)
    assert.equal(await getProductForViewer(deps, "shop-b", p.id, "b"), null)
    assert.equal(await getProductForViewer(deps, "shop-a", randomUUID(), "a"), null)
  })
})

describe("listProductsForStorePage", () => {
  it("filters unpublished products and orders newest first", async () => {
    const store = await makeStore("a", "shop-a", true)
    const p1 = await makeProduct("a", "one")
    await makeProduct("a", "two")
    const p3 = await makeProduct("a", "three")
    await setProductPublished(deps, "a", p1.id, true)
    await setProductPublished(deps, "a", p3.id, true)
    assert.deepEqual((await listProductsForStorePage(deps, store.id, false)).map((p) => p.name), ["three", "one"])
    assert.deepEqual((await listProductsForStorePage(deps, store.id, true)).map((p) => p.name), ["three", "two", "one"])
  })
})

describe("images", () => {
  it("includes image urls ordered by sortOrder", async () => {
    await makeStore("a", "shop-a")
    const p = await makeProduct("a")
    await prisma.productImage.createMany({
      data: [
        { productId: p.id, path: "x/2.png", sortOrder: 1 },
        { productId: p.id, path: "x/1.png", sortOrder: 0 },
      ],
    })
    const got = await getOwnProduct(deps, "a", p.id)
    assert.deepEqual(got?.images.map((i) => i.url), ["memory://store-images/x/1.png", "memory://store-images/x/2.png"])
  })
})

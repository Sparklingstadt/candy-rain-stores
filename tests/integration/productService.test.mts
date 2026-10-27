import { after, beforeEach, describe, it } from "node:test"
import assert from "node:assert/strict"
import { randomUUID } from "node:crypto"
import { prisma } from "../../lib/prisma"
import { assertResettableDatabase } from "../assertResettableDatabase"
import { MemoryImageStorage } from "../../lib/imageStorage"
import { createStore, setPublished, type StoreDeps } from "../../services/storeService"
import {
  addProductImage,
  createProduct,
  deleteProduct,
  getOwnProduct,
  getProductForViewer,
  isUuid,
  listOwnProducts,
  listProductsForStorePage,
  makeProductImageFirst,
  removeProductImage,
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

// Give products explicit, distinct createdAt values so ordering never depends on clock resolution.
async function setCreatedAt(productId: string, minutesAgo: number) {
  await prisma.product.update({
    where: { id: productId },
    data: { createdAt: new Date(Date.UTC(2026, 0, 1, 12, 0) - minutesAgo * 60_000) },
  })
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
    const p2 = await makeProduct("a", "two")
    await setCreatedAt(p1.id, 2)
    await setCreatedAt(p2.id, 1)
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
    const p2 = await makeProduct("a", "two")
    const p3 = await makeProduct("a", "three")
    await setCreatedAt(p1.id, 3)
    await setCreatedAt(p2.id, 2)
    await setCreatedAt(p3.id, 1)
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

const png = (n = 1) => ({
  contentType: "image/png" as const,
  ext: "png" as const,
  bytes: new Uint8Array([0x89, 0x50, 0x4e, 0x47, n]),
})

function memory(): MemoryImageStorage {
  return deps.storage as MemoryImageStorage
}

async function addImages(ownerSub: string, productId: string, count: number) {
  for (let i = 0; i < count; i++) {
    const r = await addProductImage(deps, ownerSub, productId, png(i))
    assert.equal(r.ok, true)
  }
}

describe("addProductImage", () => {
  it("appends images with increasing sortOrder under the product path", async () => {
    const store = await makeStore("a", "shop-a")
    const p = await makeProduct("a")
    await addImages("a", p.id, 3)
    const got = await getOwnProduct(deps, "a", p.id)
    assert.deepEqual(got?.images.map((i) => i.sortOrder), [0, 1, 2])
    const rows = await prisma.productImage.findMany({ where: { productId: p.id } })
    assert.equal(rows.length, 3)
    for (const row of rows) {
      assert.match(row.path, new RegExp(`^${store.id}/products/${p.id}/[0-9a-f-]{36}\\.png$`))
    }
    assert.equal(memory().files.size, 3)
  })

  it("rejects a 6th image and leaves no file behind", async () => {
    await makeStore("a", "shop-a")
    const p = await makeProduct("a")
    await addImages("a", p.id, 5)
    assert.deepEqual(await addProductImage(deps, "a", p.id, png(9)), { ok: false, code: "limit_reached" })
    assert.equal(memory().files.size, 5)
    assert.equal(await prisma.productImage.count({ where: { productId: p.id } }), 5)
  })

  it("lets only one of two concurrent adds succeed at 4 images", async () => {
    await makeStore("a", "shop-a")
    const p = await makeProduct("a")
    await addImages("a", p.id, 4)
    const results = await Promise.all([
      addProductImage(deps, "a", p.id, png(7)),
      addProductImage(deps, "a", p.id, png(8)),
    ])
    assert.equal(results.filter((r) => r.ok).length, 1)
    assert.deepEqual(results.filter((r) => !r.ok), [{ ok: false, code: "limit_reached" }])
    assert.equal(await prisma.productImage.count({ where: { productId: p.id } }), 5)
    assert.equal(memory().files.size, 5)
  })

  it("throws and adds no row when the upload fails", async () => {
    await makeStore("a", "shop-a")
    const p = await makeProduct("a")
    memory().failNextPut = true
    await assert.rejects(addProductImage(deps, "a", p.id, png()))
    assert.equal(await prisma.productImage.count({ where: { productId: p.id } }), 0)
    assert.equal(memory().files.size, 0)
  })

  it("returns not_found for foreign, missing or non-UUID products without uploading", async () => {
    await makeStore("a", "shop-a")
    await makeStore("b", "shop-b")
    const p = await makeProduct("a")
    assert.deepEqual(await addProductImage(deps, "b", p.id, png()), { ok: false, code: "not_found" })
    assert.deepEqual(await addProductImage(deps, "a", randomUUID(), png()), { ok: false, code: "not_found" })
    assert.deepEqual(await addProductImage(deps, "a", "abc", png()), { ok: false, code: "not_found" })
    assert.deepEqual(await addProductImage(deps, "nobody", p.id, png()), { ok: false, code: "not_found" })
    assert.equal(memory().files.size, 0)
  })
})

describe("makeProductImageFirst / removeProductImage", () => {
  it("moves an image to the front", async () => {
    await makeStore("a", "shop-a")
    const p = await makeProduct("a")
    await addImages("a", p.id, 3)
    const before = (await getOwnProduct(deps, "a", p.id))!
    const third = before.images[2]
    const after = await makeProductImageFirst(deps, "a", p.id, third.id)
    assert.equal(after?.images[0].id, third.id)
    assert.deepEqual(after?.images.slice(1).map((i) => i.id), [before.images[0].id, before.images[1].id])
  })

  it("removes an image row and its file", async () => {
    await makeStore("a", "shop-a")
    const p = await makeProduct("a")
    await addImages("a", p.id, 3)
    const before = (await getOwnProduct(deps, "a", p.id))!
    const after = await removeProductImage(deps, "a", p.id, before.images[0].id)
    assert.deepEqual(after?.images.map((i) => i.id), [before.images[1].id, before.images[2].id])
    assert.equal(memory().files.size, 2)
    // the new first image can still be made first / further adds keep working
    await addImages("a", p.id, 1)
    assert.equal((await getOwnProduct(deps, "a", p.id))?.images.length, 3)
  })

  it("returns null and changes nothing for foreign, mismatched or invalid ids", async () => {
    await makeStore("a", "shop-a")
    await makeStore("b", "shop-b")
    const p1 = await makeProduct("a", "one")
    const p2 = await makeProduct("a", "two")
    await addImages("a", p1.id, 2)
    await addImages("a", p2.id, 1)
    const img1 = (await getOwnProduct(deps, "a", p1.id))!.images[1]
    const img2 = (await getOwnProduct(deps, "a", p2.id))!.images[0]
    for (const fn of [removeProductImage, makeProductImageFirst]) {
      assert.equal(await fn(deps, "b", p1.id, img1.id), null)
      assert.equal(await fn(deps, "a", p1.id, img2.id), null)
      assert.equal(await fn(deps, "a", p1.id, randomUUID()), null)
      assert.equal(await fn(deps, "a", p1.id, "abc"), null)
      assert.equal(await fn(deps, "a", "abc", img1.id), null)
    }
    assert.equal(memory().files.size, 3)
    const got = (await getOwnProduct(deps, "a", p1.id))!
    assert.deepEqual(got.images.map((i) => i.sortOrder), [0, 1])
    assert.equal(await prisma.productImage.count(), 3)
  })
})

describe("deleteProduct cleanup", () => {
  it("removes the image files of the deleted product only", async () => {
    await makeStore("a", "shop-a")
    const p1 = await makeProduct("a", "one")
    const p2 = await makeProduct("a", "two")
    await addImages("a", p1.id, 2)
    await addImages("a", p2.id, 1)
    assert.equal(await deleteProduct(deps, "a", p1.id), true)
    assert.equal(memory().files.size, 1)
    assert.equal(await prisma.productImage.count({ where: { productId: p1.id } }), 0)
  })
})

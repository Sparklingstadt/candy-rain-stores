import { after, beforeEach, describe, it } from "node:test"
import assert from "node:assert/strict"
import { prisma } from "../../lib/prisma"
import { assertResettableDatabase } from "../assertResettableDatabase"
import { MemoryImageStorage } from "../../lib/imageStorage"
import {
  createStore,
  getOwnStore,
  getStore,
  getStoreForViewer,
  isStoreOwner,
  setPublished,
  STORE_ID,
  updateStore,
} from "../../services/storeService"
import type { StoreDeps } from "../../services/deps"

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
  await prisma.product.deleteMany()
  await prisma.storeSettings.deleteMany()
  storage = new MemoryImageStorage()
  deps = { db: prisma, storage }
})

after(async () => {
  await prisma.$disconnect()
})

async function create(ownerSub: string, logo = null as ReturnType<typeof png> | null) {
  const r = await createStore(deps, ownerSub, { fields, logo, header: null })
  assert.equal(r.ok, true)
  if (!r.ok) throw new Error("unreachable")
  return r.store
}

describe("createStore", () => {
  it("creates the unpublished store, saves fields and the logo", async () => {
    const store = await create("a", png())
    assert.equal(store.id, STORE_ID)
    assert.equal(store.ownerSub, "a")
    assert.equal(store.isPublished, false)
    assert.equal(store.themeColor, "#112233")
    assert.equal(store.name, "あめ屋")
    assert.match(store.logoPath ?? "", /^store\/logo-.+\.png$/)
    assert.ok(storage.files.has(store.logoPath!))
    assert.equal(store.logoUrl, `memory://store-images/${store.logoPath}`)
    assert.equal(store.headerUrl, null)
  })

  it("refuses a second store, by the owner or anyone else, and leaves no uploaded image", async () => {
    await create("a")
    for (const owner of ["a", "b"]) {
      const r = await createStore(deps, owner, { fields, logo: png(), header: png(2) })
      assert.deepEqual(r, { ok: false, code: "already_exists" })
    }
    assert.equal(storage.files.size, 0)
    assert.equal((await getStore(deps))?.ownerSub, "a")
  })

  it("lets only one of two concurrent creates succeed", async () => {
    const results = await Promise.all([
      createStore(deps, "a", { fields, logo: png(), header: null }),
      createStore(deps, "b", { fields, logo: png(), header: null }),
    ])
    assert.equal(results.filter((r) => r.ok).length, 1)
    assert.deepEqual(results.find((r) => !r.ok), { ok: false, code: "already_exists" })
    assert.equal(await prisma.storeSettings.count(), 1)
    assert.equal(storage.files.size, 1)
  })

  it("cannot hold a second row even when written directly", async () => {
    await create("a")
    await assert.rejects(prisma.storeSettings.create({ data: { id: 2, ownerSub: "b", name: "x" } }))
  })
})

describe("updateStore", () => {
  const upd = { fields: { ...fields, name: "新しい名前" }, logo: null, header: null, removeLogo: false, removeHeader: false }

  it("lets only the owner change the store", async () => {
    assert.deepEqual(await updateStore(deps, "a", upd), { ok: false, code: "not_found" })
    await create("a")
    assert.deepEqual(await updateStore(deps, "b", upd), { ok: false, code: "not_found" })
    assert.equal((await getStore(deps))?.name, "あめ屋")
    const r = await updateStore(deps, "a", upd)
    assert.ok(r.ok && r.store.name === "新しい名前")
  })

  it("saves and clears the contact email", async () => {
    await create("a")
    const set = await updateStore(deps, "a", { ...upd, fields: { ...upd.fields, contactEmail: "shop@example.com" } })
    assert.ok(set.ok && set.store.contactEmail === "shop@example.com")
    const cleared = await updateStore(deps, "a", { ...upd, fields: { ...upd.fields, contactEmail: null } })
    assert.ok(cleared.ok && cleared.store.contactEmail === null)
  })

  it("replaces the logo and removes the old file", async () => {
    const a = await create("a", png(1))
    const r = await updateStore(deps, "a", { ...upd, logo: png(2) })
    assert.equal(r.ok, true)
    if (!r.ok) return
    assert.notEqual(r.store.logoPath, a.logoPath)
    assert.deepEqual([...storage.files.keys()], [r.store.logoPath])
  })

  it("removes the logo with removeLogo", async () => {
    await create("a", png())
    const r = await updateStore(deps, "a", { ...upd, removeLogo: true })
    assert.equal(r.ok, true)
    if (!r.ok) return
    assert.equal(r.store.logoPath, null)
    assert.equal(r.store.logoUrl, null)
    assert.equal(storage.files.size, 0)
  })

  it("throws and leaves the database untouched when upload fails", async () => {
    const a = await create("a", png(1))
    storage.failNextPut = true
    await assert.rejects(updateStore(deps, "a", { ...upd, logo: png(2) }))
    const row = await prisma.storeSettings.findUniqueOrThrow({ where: { id: STORE_ID } })
    assert.equal(row.name, "あめ屋")
    assert.equal(row.logoPath, a.logoPath)
    assert.deepEqual([...storage.files.keys()], [a.logoPath])
  })
})

describe("getStoreForViewer / setPublished / getOwnStore", () => {
  it("hides the unpublished store from others and previews it for the owner", async () => {
    await create("a")
    assert.equal(await getStoreForViewer(deps, null), null)
    assert.equal(await getStoreForViewer(deps, "b"), null)
    const owner = await getStoreForViewer(deps, "a")
    assert.equal(owner?.isOwnerPreview, true)
    assert.equal(owner?.store.name, "あめ屋")
  })

  it("serves the published store to everyone", async () => {
    await create("a")
    assert.equal(await setPublished(deps, "b", true), null)
    const p = await setPublished(deps, "a", true)
    assert.equal(p?.isPublished, true)
    for (const viewer of [null, "b", "a"]) {
      const v = await getStoreForViewer(deps, viewer)
      assert.equal(v?.isOwnerPreview, false)
    }
  })

  it("returns null before the store exists and only gives the owner their store", async () => {
    assert.equal(await getStore(deps), null)
    assert.equal(await getStoreForViewer(deps, "a"), null)
    assert.equal(await setPublished(deps, "a", true), null)
    assert.equal(await getOwnStore(deps, "a"), null)
    assert.equal(await isStoreOwner(deps, "a"), false)
    await create("a")
    assert.equal((await getOwnStore(deps, "a"))?.name, "あめ屋")
    assert.equal(await getOwnStore(deps, "b"), null)
    assert.equal(await isStoreOwner(deps, "a"), true)
    assert.equal(await isStoreOwner(deps, "b"), false)
  })
})

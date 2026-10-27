import { randomUUID } from "node:crypto"
import { Prisma } from "../generated/prisma/client"
import type { PrismaClient, Store } from "../generated/prisma/client"
import type { ImageStorage } from "../lib/imageStorage"
import {
  normalizeSlug,
  validateSlug,
  type FieldErrors,
  type ImageType,
  type StoreFields,
} from "../lib/storeValidation"

export type StoreDeps = { db: PrismaClient; storage: ImageStorage }
export type ImageInput = (ImageType & { bytes: Uint8Array }) | null // null = 変更なし
export type StoreView = Store & { logoUrl: string | null; headerUrl: string | null }
export type CreateResult =
  | { ok: true; store: StoreView }
  | { ok: false; code: "invalid"; errors: FieldErrors }
  | { ok: false; code: "already_has_store" }
export type UpdateResult =
  | { ok: true; store: StoreView }
  | { ok: false; code: "invalid"; errors: FieldErrors }
  | { ok: false; code: "not_found" }

const SLUG_TAKEN = "このストア ID はすでに使われています"

export function toView(storage: ImageStorage, store: Store): StoreView {
  return {
    ...store,
    logoUrl: store.logoPath ? storage.publicUrl(store.logoPath) : null,
    headerUrl: store.headerPath ? storage.publicUrl(store.headerPath) : null,
  }
}

function imagePath(storeId: string, kind: "logo" | "header", image: ImageType): string {
  return `${storeId}/${kind}-${randomUUID()}.${image.ext}`
}

async function putImage(
  storage: ImageStorage,
  storeId: string,
  kind: "logo" | "header",
  image: NonNullable<ImageInput>,
  uploaded: string[],
): Promise<string> {
  const path = imagePath(storeId, kind, image)
  await storage.put(path, image.bytes, image.contentType)
  uploaded.push(path)
  return path
}

export async function removeQuietly(storage: ImageStorage, paths: (string | null)[]): Promise<void> {
  const list = paths.filter((p): p is string => p !== null)
  if (list.length === 0) return
  try {
    await storage.remove(list)
  } catch (error) {
    console.error("Failed to remove store images", list, error)
  }
}

function uniqueTargets(error: Prisma.PrismaClientKnownRequestError): string {
  const meta = error.meta as { target?: unknown; driverAdapterError?: unknown } | undefined
  // The target is a field list (or constraint name) depending on the driver; fall back to the raw meta.
  return JSON.stringify(meta?.target ?? meta ?? "")
}

export async function getOwnStore(deps: StoreDeps, ownerSub: string): Promise<StoreView | null> {
  const store = await deps.db.store.findUnique({ where: { ownerSub } })
  return store ? toView(deps.storage, store) : null
}

export async function getStoreForViewer(
  deps: StoreDeps,
  slug: string,
  viewerSub: string | null,
): Promise<{ store: StoreView; isOwnerPreview: boolean } | null> {
  const store = await deps.db.store.findUnique({ where: { slug: normalizeSlug(slug) } })
  if (!store) return null
  if (store.isPublished) return { store: toView(deps.storage, store), isOwnerPreview: false }
  if (viewerSub !== null && viewerSub === store.ownerSub) {
    return { store: toView(deps.storage, store), isOwnerPreview: true }
  }
  return null
}

export async function createStore(
  deps: StoreDeps,
  ownerSub: string,
  input: { slug: string; fields: StoreFields; logo: ImageInput; header: ImageInput },
): Promise<CreateResult> {
  const slugResult = validateSlug(input.slug)
  if (!slugResult.ok) return { ok: false, code: "invalid", errors: { slug: slugResult.error } }

  const existing = await deps.db.store.findUnique({ where: { ownerSub }, select: { id: true } })
  if (existing) return { ok: false, code: "already_has_store" }

  const id = randomUUID()
  const uploaded: string[] = []
  try {
    const logoPath = input.logo ? await putImage(deps.storage, id, "logo", input.logo, uploaded) : null
    const headerPath = input.header
      ? await putImage(deps.storage, id, "header", input.header, uploaded)
      : null
    const store = await deps.db.store.create({
      data: { id, ownerSub, slug: slugResult.slug, ...input.fields, logoPath, headerPath },
    })
    return { ok: true, store: toView(deps.storage, store) }
  } catch (error) {
    await removeQuietly(deps.storage, uploaded)
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const target = uniqueTargets(error)
      if (target.includes("ownerSub")) return { ok: false, code: "already_has_store" }
      if (target.includes("slug")) {
        return { ok: false, code: "invalid", errors: { slug: SLUG_TAKEN } }
      }
    }
    throw error
  }
}

export async function updateStore(
  deps: StoreDeps,
  ownerSub: string,
  input: {
    fields: StoreFields
    logo: ImageInput
    header: ImageInput
    removeLogo: boolean
    removeHeader: boolean
  },
): Promise<UpdateResult> {
  const current = await deps.db.store.findUnique({ where: { ownerSub } })
  if (!current) return { ok: false, code: "not_found" }

  const uploaded: string[] = []
  try {
    const newLogo = input.logo ? await putImage(deps.storage, current.id, "logo", input.logo, uploaded) : null
    const newHeader = input.header
      ? await putImage(deps.storage, current.id, "header", input.header, uploaded)
      : null

    const logoPath = newLogo ?? (input.removeLogo ? null : current.logoPath)
    const headerPath = newHeader ?? (input.removeHeader ? null : current.headerPath)

    const store = await deps.db.store.update({
      where: { ownerSub },
      data: { ...input.fields, logoPath, headerPath },
    })
    await removeQuietly(deps.storage, [
      logoPath !== current.logoPath ? current.logoPath : null,
      headerPath !== current.headerPath ? current.headerPath : null,
    ])
    return { ok: true, store: toView(deps.storage, store) }
  } catch (error) {
    await removeQuietly(deps.storage, uploaded)
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return { ok: false, code: "not_found" }
    }
    throw error
  }
}

export async function setPublished(
  deps: StoreDeps,
  ownerSub: string,
  isPublished: boolean,
): Promise<StoreView | null> {
  try {
    const store = await deps.db.store.update({ where: { ownerSub }, data: { isPublished } })
    return toView(deps.storage, store)
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") return null
    throw error
  }
}

export async function deleteStore(
  deps: StoreDeps,
  ownerSub: string,
  confirmSlug: string,
): Promise<{ ok: true } | { ok: false; code: "not_found" | "confirm_mismatch" }> {
  const store = await deps.db.store.findUnique({ where: { ownerSub } })
  if (!store) return { ok: false, code: "not_found" }
  if (normalizeSlug(confirmSlug) !== store.slug) return { ok: false, code: "confirm_mismatch" }

  // Product rows (and their image rows) cascade with the store, so collect the file paths first.
  const productImages = await deps.db.productImage.findMany({
    where: { product: { storeId: store.id } },
    select: { path: true },
  })
  await deps.db.store.deleteMany({ where: { id: store.id, ownerSub } })
  await removeQuietly(deps.storage, [store.logoPath, store.headerPath, ...productImages.map((i) => i.path)])
  return { ok: true }
}

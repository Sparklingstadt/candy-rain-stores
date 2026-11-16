import { randomUUID } from "node:crypto"
import { Prisma } from "../generated/prisma/client"
import type { StoreSettings } from "../generated/prisma/client"
import type { ImageStorage } from "../lib/imageStorage"
import type { FieldErrors, ImageType, StoreFields } from "../lib/storeValidation"
import type { StoreDeps } from "./deps"

export type ImageInput = (ImageType & { bytes: Uint8Array }) | null // null = 変更なし
export type StoreView = StoreSettings & { logoUrl: string | null; headerUrl: string | null }
export type CreateResult =
  | { ok: true; store: StoreView }
  | { ok: false; code: "invalid"; errors: FieldErrors }
  | { ok: false; code: "already_exists" } // お店はサイトに 1 つだけ。すでに誰かが作っている
export type UpdateResult =
  | { ok: true; store: StoreView }
  | { ok: false; code: "invalid"; errors: FieldErrors }
  | { ok: false; code: "not_found" }

// StoreSettings はこの 1 行だけ（SQL の CHECK 制約でも 2 行目を作れない）
export const STORE_ID = 1

export function toView(storage: ImageStorage, store: StoreSettings): StoreView {
  return {
    ...store,
    logoUrl: store.logoPath ? storage.publicUrl(store.logoPath) : null,
    headerUrl: store.headerPath ? storage.publicUrl(store.headerPath) : null,
  }
}

function imagePath(kind: "logo" | "header", image: ImageType): string {
  return `store/${kind}-${randomUUID()}.${image.ext}`
}

async function putImage(
  storage: ImageStorage,
  kind: "logo" | "header",
  image: NonNullable<ImageInput>,
  uploaded: string[],
): Promise<string> {
  const path = imagePath(kind, image)
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

// サイトのお店。まだ作られていなければ null
export async function getStore(deps: StoreDeps): Promise<StoreView | null> {
  const store = await deps.db.storeSettings.findUnique({ where: { id: STORE_ID } })
  return store ? toView(deps.storage, store) : null
}

// ownerSub がお店のオーナーならお店を返す
export async function getOwnStore(deps: StoreDeps, ownerSub: string): Promise<StoreView | null> {
  const store = await getStore(deps)
  return store && store.ownerSub === ownerSub ? store : null
}

export async function isStoreOwner(deps: StoreDeps, ownerSub: string): Promise<boolean> {
  const store = await deps.db.storeSettings.findUnique({ where: { id: STORE_ID }, select: { ownerSub: true } })
  return store?.ownerSub === ownerSub
}

// 公開中なら誰でも見られる。非公開ならオーナー本人にだけプレビューとして見せる
export async function getStoreForViewer(
  deps: StoreDeps,
  viewerSub: string | null,
): Promise<{ store: StoreView; isOwnerPreview: boolean } | null> {
  const store = await getStore(deps)
  if (!store) return null
  if (store.isPublished) return { store, isOwnerPreview: false }
  if (viewerSub !== null && viewerSub === store.ownerSub) return { store, isOwnerPreview: true }
  return null
}

// お店がまだなければ作り、作った人がオーナーになる。すでにあれば作らない
export async function createStore(
  deps: StoreDeps,
  ownerSub: string,
  input: { fields: StoreFields; logo: ImageInput; header: ImageInput },
): Promise<CreateResult> {
  const existing = await deps.db.storeSettings.findUnique({ where: { id: STORE_ID }, select: { id: true } })
  if (existing) return { ok: false, code: "already_exists" }

  const uploaded: string[] = []
  try {
    const logoPath = input.logo ? await putImage(deps.storage, "logo", input.logo, uploaded) : null
    const headerPath = input.header ? await putImage(deps.storage, "header", input.header, uploaded) : null
    const store = await deps.db.storeSettings.create({
      data: { id: STORE_ID, ownerSub, ...input.fields, logoPath, headerPath },
    })
    return { ok: true, store: toView(deps.storage, store) }
  } catch (error) {
    await removeQuietly(deps.storage, uploaded)
    // 同時に作られた
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { ok: false, code: "already_exists" }
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
  const current = await deps.db.storeSettings.findUnique({ where: { id: STORE_ID } })
  if (!current || current.ownerSub !== ownerSub) return { ok: false, code: "not_found" }

  const uploaded: string[] = []
  try {
    const newLogo = input.logo ? await putImage(deps.storage, "logo", input.logo, uploaded) : null
    const newHeader = input.header ? await putImage(deps.storage, "header", input.header, uploaded) : null

    const logoPath = newLogo ?? (input.removeLogo ? null : current.logoPath)
    const headerPath = newHeader ?? (input.removeHeader ? null : current.headerPath)

    const store = await deps.db.storeSettings.update({
      where: { id: STORE_ID, ownerSub },
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
    const store = await deps.db.storeSettings.update({ where: { id: STORE_ID, ownerSub }, data: { isPublished } })
    return toView(deps.storage, store)
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") return null
    throw error
  }
}

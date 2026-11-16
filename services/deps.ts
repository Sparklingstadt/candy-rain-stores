import type { PrismaClient } from "../generated/prisma/client"
import { getImageStorage, type ImageStorage } from "../lib/imageStorage"
import { prisma } from "../lib/prisma"

// services の関数が最初の引数で受け取るもの。テストでは画像の置き場所をメモリに差し替える
export type StoreDeps = { db: PrismaClient; storage: ImageStorage }

// 本番の StoreDeps。画面と Server Action はここから受け取って services に渡す
export function deps(): StoreDeps {
  return { db: prisma, storage: getImageStorage() }
}

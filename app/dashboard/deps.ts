import { getImageStorage } from "@/lib/imageStorage"
import { prisma } from "@/lib/prisma"

export function deps() {
  return { db: prisma, storage: getImageStorage() }
}

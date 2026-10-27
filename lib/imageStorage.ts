import { createClient } from "@supabase/supabase-js"

const BUCKET = "store-images"

export interface ImageStorage {
  put(path: string, bytes: Uint8Array, contentType: string): Promise<void>
  remove(paths: string[]): Promise<void>
  publicUrl(path: string): string
}

export class MemoryImageStorage implements ImageStorage {
  readonly files = new Map<string, Uint8Array>()
  failNextPut = false

  async put(path: string, bytes: Uint8Array): Promise<void> {
    if (this.failNextPut) {
      this.failNextPut = false
      throw new Error("MemoryImageStorage: put failed (failNextPut)")
    }
    this.files.set(path, bytes)
  }

  async remove(paths: string[]): Promise<void> {
    for (const path of paths) this.files.delete(path)
  }

  publicUrl(path: string): string {
    return `memory://${BUCKET}/${path}`
  }
}

function createSupabaseImageStorage(): ImageStorage {
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    throw new Error(
      "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set (or set IMAGE_STORAGE=memory)",
    )
  }
  const bucket = createClient(url, key, { auth: { persistSession: false } }).storage.from(BUCKET)
  return {
    async put(path, bytes, contentType) {
      const { error } = await bucket.upload(path, bytes, { contentType, upsert: false })
      if (error) throw new Error(`Image upload failed: ${error.message}`)
    },
    async remove(paths) {
      if (paths.length === 0) return
      const { error } = await bucket.remove(paths)
      if (error) throw new Error(`Image removal failed: ${error.message}`)
    },
    publicUrl(path) {
      return bucket.getPublicUrl(path).data.publicUrl
    },
  }
}

let instance: ImageStorage | undefined

export function getImageStorage(): ImageStorage {
  if (!instance) {
    instance = process.env.IMAGE_STORAGE === "memory" ? new MemoryImageStorage() : createSupabaseImageStorage()
  }
  return instance
}

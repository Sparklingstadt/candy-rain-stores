import { validatePaymentInstructions } from "./orderValidation"

export const DEFAULT_THEME_COLOR = "#e85d8f"
export const MAX_IMAGE_BYTES = 2 * 1024 * 1024

export type StoreField = "slug" | "name" | "description" | "themeColor" | "paymentInstructions" | "logo" | "header"
export type FieldErrors = Partial<Record<StoreField, string>>
export type StoreFields = {
  name: string
  description: string | null
  themeColor: string
  paymentInstructions?: string | null // 省略すると変更しない
}

const SLUG_PATTERN = /^[a-z0-9](?:[a-z0-9-]{1,28}[a-z0-9])$/
const COLOR_PATTERN = /^#[0-9a-f]{6}$/
const NAME_MAX = 50
const DESCRIPTION_MAX = 500

export function normalizeSlug(raw: string): string {
  return raw.trim().toLowerCase()
}

export function validateSlug(
  raw: string,
): { ok: true; slug: string } | { ok: false; error: string } {
  const slug = normalizeSlug(raw)
  if (!SLUG_PATTERN.test(slug)) {
    return {
      ok: false,
      error:
        "ストア ID は英小文字・数字・ハイフンで 3〜30 文字にしてください（先頭と末尾にハイフンは使えません）",
    }
  }
  return { ok: true, slug }
}

export function validateStoreFields(raw: {
  name: string
  description: string
  themeColor: string
  paymentInstructions?: string
}): { ok: true; value: StoreFields } | { ok: false; errors: FieldErrors } {
  const errors: FieldErrors = {}

  const name = raw.name.trim()
  if (name.length < 1 || name.length > NAME_MAX) {
    errors.name = `ストア名は 1〜${NAME_MAX} 文字で入力してください`
  }

  const description = raw.description.trim()
  if (description.length > DESCRIPTION_MAX) {
    errors.description = `説明文は ${DESCRIPTION_MAX} 文字以内で入力してください`
  }

  const themeColor = raw.themeColor.trim().toLowerCase()
  if (!COLOR_PATTERN.test(themeColor)) {
    errors.themeColor = "テーマカラーは #rrggbb の形式で入力してください"
  }

  const payment = validatePaymentInstructions(raw.paymentInstructions ?? "")
  if (!payment.ok) errors.paymentInstructions = payment.error

  if (Object.keys(errors).length > 0 || !payment.ok) return { ok: false, errors }
  return {
    ok: true,
    value: {
      name,
      description: description === "" ? null : description,
      themeColor,
      paymentInstructions: payment.value,
    },
  }
}

export type ImageType = {
  contentType: "image/png" | "image/jpeg" | "image/webp"
  ext: "png" | "jpg" | "webp"
}

function startsWith(bytes: Uint8Array, signature: number[], offset = 0): boolean {
  return signature.every((b, i) => bytes[offset + i] === b)
}

function detectImageType(bytes: Uint8Array): ImageType | null {
  if (startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) {
    return { contentType: "image/png", ext: "png" }
  }
  if (startsWith(bytes, [0xff, 0xd8, 0xff])) {
    return { contentType: "image/jpeg", ext: "jpg" }
  }
  if (startsWith(bytes, [0x52, 0x49, 0x46, 0x46]) && startsWith(bytes, [0x57, 0x45, 0x42, 0x50], 8)) {
    return { contentType: "image/webp", ext: "webp" }
  }
  return null
}

export function validateImage(
  bytes: Uint8Array,
): { ok: true; image: (ImageType & { bytes: Uint8Array }) | null } | { ok: false; error: string } {
  if (bytes.length === 0) return { ok: true, image: null }
  const type = detectImageType(bytes)
  if (!type) return { ok: false, error: "PNG・JPEG・WebP の画像を選んでください" }
  if (bytes.length > MAX_IMAGE_BYTES) return { ok: false, error: "画像は 2MB 以下にしてください" }
  return { ok: true, image: { ...type, bytes } }
}

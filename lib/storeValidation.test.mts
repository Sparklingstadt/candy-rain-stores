import assert from "node:assert/strict"
import test from "node:test"
import {
  DEFAULT_THEME_COLOR,
  MAX_IMAGE_BYTES,
  validateImage,
  validateSlug,
  validateStoreFields,
} from "./storeValidation"

const SLUG_MESSAGE =
  "ストア ID は英小文字・数字・ハイフンで 3〜30 文字にしてください（先頭と末尾にハイフンは使えません）"

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]

function pngOfSize(size: number): Uint8Array {
  const bytes = new Uint8Array(size)
  bytes.set(PNG_SIGNATURE)
  return bytes
}

test("既定値", () => {
  assert.equal(DEFAULT_THEME_COLOR, "#e85d8f")
  assert.equal(MAX_IMAGE_BYTES, 2 * 1024 * 1024)
})

test("ストア ID は前後の空白を除き小文字化して受け付ける", () => {
  assert.deepEqual(validateSlug("sweets-shop"), { ok: true, slug: "sweets-shop" })
  assert.deepEqual(validateSlug(" Sweets-Shop "), { ok: true, slug: "sweets-shop" })
})

test("ストア ID は 3〜30 文字で境界を含む", () => {
  assert.deepEqual(validateSlug("abc"), { ok: true, slug: "abc" })
  const thirty = "a".repeat(30)
  assert.deepEqual(validateSlug(thirty), { ok: true, slug: thirty })
  assert.deepEqual(validateSlug("ab"), { ok: false, error: SLUG_MESSAGE })
  assert.deepEqual(validateSlug("a".repeat(31)), { ok: false, error: SLUG_MESSAGE })
})

test("ストア ID は先頭末尾のハイフン・アンダースコア・全角を拒否する", () => {
  for (const bad of ["-shop", "shop-", "sweets_shop", "ｓｈｏｐ"]) {
    assert.deepEqual(validateSlug(bad), { ok: false, error: SLUG_MESSAGE }, bad)
  }
})

test("ストア名は trim し、説明が空なら null、色は小文字化する", () => {
  assert.deepEqual(
    validateStoreFields({ name: "  キャンディ屋  ", description: "", themeColor: "#E85D8F" }),
    {
      ok: true,
      value: {
        name: "キャンディ屋",
        description: null,
        themeColor: "#e85d8f",
        paymentInstructions: null,
        contactEmail: null,
      },
    },
  )
})

test("ストア名は 1〜50 文字", () => {
  const base = { description: "", themeColor: "#e85d8f" }
  const blank = validateStoreFields({ ...base, name: "   " })
  assert.equal(blank.ok, false)
  assert.ok(!blank.ok && blank.errors.name)
  assert.equal(validateStoreFields({ ...base, name: "あ".repeat(50) }).ok, true)
  const long = validateStoreFields({ ...base, name: "あ".repeat(51) })
  assert.ok(!long.ok && long.errors.name)
})

test("説明文は 500 文字まで", () => {
  const base = { name: "店", themeColor: "#e85d8f" }
  assert.equal(validateStoreFields({ ...base, description: "あ".repeat(500) }).ok, true)
  const long = validateStoreFields({ ...base, description: "あ".repeat(501) })
  assert.ok(!long.ok && long.errors.description)
})

test("テーマカラーは #rrggbb のみ", () => {
  for (const bad of ["red", "#fff"]) {
    const r = validateStoreFields({ name: "店", description: "", themeColor: bad })
    assert.ok(!r.ok && r.errors.themeColor, bad)
  }
})

test("複数の誤りを同時に返す", () => {
  const r = validateStoreFields({ name: "", description: "あ".repeat(501), themeColor: "red" })
  assert.ok(!r.ok)
  assert.deepEqual(Object.keys(r.errors).sort(), ["description", "name", "themeColor"])
})

test("画像は先頭バイトで形式を判定する", () => {
  const png = validateImage(pngOfSize(16))
  assert.ok(png.ok && png.image)
  assert.equal(png.image.contentType, "image/png")
  assert.equal(png.image.ext, "png")

  const jpeg = validateImage(new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 0]))
  assert.ok(jpeg.ok && jpeg.image)
  assert.equal(jpeg.image.contentType, "image/jpeg")
  assert.equal(jpeg.image.ext, "jpg")

  const webp = validateImage(
    new Uint8Array([0x52, 0x49, 0x46, 0x46, 1, 2, 3, 4, 0x57, 0x45, 0x42, 0x50, 0]),
  )
  assert.ok(webp.ok && webp.image)
  assert.equal(webp.image.contentType, "image/webp")
  assert.equal(webp.image.ext, "webp")
})

test("画像は GIF など未対応形式を拒否する", () => {
  const gif = new TextEncoder().encode("GIF89a\u0001\u0000")
  assert.deepEqual(validateImage(gif), { ok: false, error: "PNG・JPEG・WebP の画像を選んでください" })
})

test("空の画像は「画像なし」", () => {
  assert.deepEqual(validateImage(new Uint8Array(0)), { ok: true, image: null })
})

test("画像は 2MB ちょうどまで", () => {
  assert.equal(validateImage(pngOfSize(MAX_IMAGE_BYTES)).ok, true)
  assert.deepEqual(validateImage(pngOfSize(MAX_IMAGE_BYTES + 1)), {
    ok: false,
    error: "画像は 2MB 以下にしてください",
  })
})

test("お支払い方法の案内は trim し、空なら null、1,000 文字まで", () => {
  const base = { name: "店", description: "", themeColor: "#e85d8f" }
  const ok = validateStoreFields({ ...base, paymentInstructions: "  銀行振込  " })
  assert.ok(ok.ok && ok.value.paymentInstructions === "銀行振込")
  const blank = validateStoreFields({ ...base, paymentInstructions: "   " })
  assert.ok(blank.ok && blank.value.paymentInstructions === null)
  assert.equal(validateStoreFields({ ...base, paymentInstructions: "あ".repeat(1000) }).ok, true)
  const long = validateStoreFields({ ...base, paymentInstructions: "あ".repeat(1001) })
  assert.ok(!long.ok && long.errors.paymentInstructions)
})

test("連絡先のメールアドレスは trim し、空なら null、形式と 254 文字までを確かめる", () => {
  const base = { name: "店", description: "", themeColor: "#e85d8f" }
  const ok = validateStoreFields({ ...base, contactEmail: "  shop@example.com  " })
  assert.ok(ok.ok && ok.value.contactEmail === "shop@example.com")
  const blank = validateStoreFields({ ...base, contactEmail: "   " })
  assert.ok(blank.ok && blank.value.contactEmail === null)
  for (const bad of ["shop", "shop@", "@example.com", "shop@example", "a b@example.com"]) {
    const r = validateStoreFields({ ...base, contactEmail: bad })
    assert.ok(!r.ok && r.errors.contactEmail, bad)
  }
  const long = validateStoreFields({ ...base, contactEmail: "a".repeat(243) + "@example.com" })
  assert.ok(!long.ok && long.errors.contactEmail)
})

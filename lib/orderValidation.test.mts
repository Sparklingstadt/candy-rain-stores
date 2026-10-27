import assert from "node:assert/strict"
import test from "node:test"
import {
  MAX_CART_ITEMS,
  MAX_QUANTITY,
  PREFECTURES,
  parseQuantity,
  validatePaymentInstructions,
  validateShipping,
} from "./orderValidation"

const POSTAL = "郵便番号は 7 桁の半角数字で入力してください"
const PREFECTURE = "都道府県を選んでください"
const ADDRESS = "住所は 1〜200 文字で入力してください"
const PHONE = "電話番号は 10〜11 桁の半角数字（ハイフン可）で入力してください"
const PAYMENT = "お支払い方法の案内は 1000 文字以内で入力してください"

const valid = { postalCode: "123-4567", prefecture: "東京都", address: "千代田区 1-1", phone: "03-1234-5678" }

function errorsOf(patch: Partial<typeof valid>) {
  const result = validateShipping({ ...valid, ...patch })
  assert.equal(result.ok, false)
  return result.ok ? {} : result.errors
}

test("上限の定数", () => {
  assert.equal(MAX_QUANTITY, 10)
  assert.equal(MAX_CART_ITEMS, 30)
})

test("都道府県は 47 件", () => {
  assert.equal(PREFECTURES.length, 47)
  assert.equal(PREFECTURES[0], "北海道")
  assert.equal(PREFECTURES[46], "沖縄県")
  assert.equal(new Set(PREFECTURES).size, 47)
})

test("正しい配送先は整形して受け付ける", () => {
  assert.deepEqual(validateShipping(valid), { ok: true, value: valid })
  assert.deepEqual(
    validateShipping({ postalCode: "1234567", prefecture: "東京都", address: "  千代田区  ", phone: " 09012345678 " }),
    { ok: true, value: { postalCode: "123-4567", prefecture: "東京都", address: "千代田区", phone: "09012345678" } },
  )
  assert.deepEqual(validateShipping({ ...valid, postalCode: " 123-4567 " }), { ok: true, value: valid })
})

test("郵便番号の誤り", () => {
  for (const postalCode of ["123456", "12-34567", "１２３４５６７", ""]) {
    assert.equal(errorsOf({ postalCode }).postalCode, POSTAL, postalCode)
  }
})

test("都道府県の誤り", () => {
  for (const prefecture of ["東京", ""]) {
    assert.equal(errorsOf({ prefecture }).prefecture, PREFECTURE, prefecture)
  }
})

test("住所の長さ", () => {
  assert.equal(errorsOf({ address: "   " }).address, ADDRESS)
  assert.equal(errorsOf({ address: "あ".repeat(201) }).address, ADDRESS)
  assert.equal(validateShipping({ ...valid, address: "あ".repeat(200) }).ok, true)
})

test("電話番号", () => {
  assert.equal(validateShipping({ ...valid, phone: "09012345678" }).ok, true)
  for (const phone of ["123456789", "090123456789", "03(1234)5678", "０３１２３４５６７８", ""]) {
    assert.equal(errorsOf({ phone }).phone, PHONE, phone)
  }
})

test("複数の誤りを同時に返す", () => {
  assert.deepEqual(errorsOf({ postalCode: "1", prefecture: "", address: "", phone: "1" }), {
    postalCode: POSTAL,
    prefecture: PREFECTURE,
    address: ADDRESS,
    phone: PHONE,
  })
})

test("parseQuantity", () => {
  assert.equal(parseQuantity("1"), 1)
  assert.equal(parseQuantity("10"), 10)
  assert.equal(parseQuantity(3), 3)
  for (const raw of ["0", "11", "-1", "1.5", "abc", "", 0, 11, 1.5, Number.NaN]) {
    assert.equal(parseQuantity(raw), null, String(raw))
  }
})

test("お支払い方法の案内", () => {
  assert.deepEqual(validatePaymentInstructions(""), { ok: true, value: null })
  assert.deepEqual(validatePaymentInstructions("  \n "), { ok: true, value: null })
  assert.deepEqual(validatePaymentInstructions(" 銀行振込 "), { ok: true, value: "銀行振込" })
  assert.deepEqual(validatePaymentInstructions("あ".repeat(1000)), { ok: true, value: "あ".repeat(1000) })
  assert.deepEqual(validatePaymentInstructions("あ".repeat(1001)), { ok: false, error: PAYMENT })
})

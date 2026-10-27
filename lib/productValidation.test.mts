import assert from "node:assert/strict"
import test from "node:test"
import {
  MAX_IMAGES_PER_PRODUCT,
  MAX_PRODUCTS_PER_STORE,
  validateProductFields,
} from "./productValidation"

const NAME_MESSAGE = "商品名は 1〜80 文字で入力してください"
const DESCRIPTION_MESSAGE = "説明文は 2000 文字以内で入力してください"
const PRICE_MESSAGE = "価格は 1〜9,999,999 円の半角数字で入力してください"
const STOCK_MESSAGE = "在庫数は 0〜99,999 の半角数字で入力してください"

const valid = { name: "キャンディ", description: "", price: "100", stock: "1" }

test("上限の定数", () => {
  assert.equal(MAX_PRODUCTS_PER_STORE, 100)
  assert.equal(MAX_IMAGES_PER_PRODUCT, 5)
})

test("正しい入力は整形して受け付ける", () => {
  assert.deepEqual(
    validateProductFields({
      name: "  ガラスのキャンディ  ",
      description: "",
      price: "1,200",
      stock: "99,999",
    }),
    {
      ok: true,
      value: { name: "ガラスのキャンディ", description: null, price: 1200, stock: 99999 },
    },
  )
})

test("商品名は 1〜80 文字", () => {
  assert.deepEqual(validateProductFields({ ...valid, name: "   " }), {
    ok: false,
    errors: { name: NAME_MESSAGE },
  })
  assert.deepEqual(validateProductFields({ ...valid, name: "あ".repeat(81) }), {
    ok: false,
    errors: { name: NAME_MESSAGE },
  })
  assert.equal(validateProductFields({ ...valid, name: "あ".repeat(80) }).ok, true)
})

test("説明文は 2000 文字まで、空なら null", () => {
  assert.deepEqual(validateProductFields({ ...valid, description: "あ".repeat(2001) }), {
    ok: false,
    errors: { description: DESCRIPTION_MESSAGE },
  })
  assert.deepEqual(validateProductFields({ ...valid, description: "あ".repeat(2000) }), {
    ok: true,
    value: { name: "キャンディ", description: "あ".repeat(2000), price: 100, stock: 1 },
  })
  assert.deepEqual(validateProductFields({ ...valid, description: "  " }), {
    ok: true,
    value: { name: "キャンディ", description: null, price: 100, stock: 1 },
  })
})

test("価格は 1〜9,999,999 の半角数字", () => {
  const price = (p: string) => validateProductFields({ ...valid, price: p })
  assert.deepEqual(price("0100"), {
    ok: true,
    value: { name: "キャンディ", description: null, price: 100, stock: 1 },
  })
  assert.deepEqual(price("1"), {
    ok: true,
    value: { name: "キャンディ", description: null, price: 1, stock: 1 },
  })
  assert.deepEqual(price("9,999,999"), {
    ok: true,
    value: { name: "キャンディ", description: null, price: 9999999, stock: 1 },
  })
  for (const bad of ["0", "10000000", "", "１２００", "12.5", "-1", "abc"]) {
    assert.deepEqual(price(bad), { ok: false, errors: { price: PRICE_MESSAGE } }, bad)
  }
})

test("在庫は 0〜99,999 の半角数字", () => {
  const stock = (s: string) => validateProductFields({ ...valid, stock: s })
  assert.deepEqual(stock("0"), {
    ok: true,
    value: { name: "キャンディ", description: null, price: 100, stock: 0 },
  })
  assert.deepEqual(stock("99,999"), {
    ok: true,
    value: { name: "キャンディ", description: null, price: 100, stock: 99999 },
  })
  for (const bad of ["100000", "", "-1", "３"]) {
    assert.deepEqual(stock(bad), { ok: false, errors: { stock: STOCK_MESSAGE } }, bad)
  }
})

test("複数の誤りを同時に返す", () => {
  assert.deepEqual(
    validateProductFields({
      name: "",
      description: "あ".repeat(2001),
      price: "0",
      stock: "-1",
    }),
    {
      ok: false,
      errors: {
        name: NAME_MESSAGE,
        description: DESCRIPTION_MESSAGE,
        price: PRICE_MESSAGE,
        stock: STOCK_MESSAGE,
      },
    },
  )
})

test("在庫数を変えていないときは上限を超えていても受け付ける", () => {
  // キャンセルで在庫が戻り 99,999 を超えた商品でも、在庫以外の編集はできる
  assert.deepEqual(validateProductFields({ ...valid, stock: "100,005" }, { stockBase: 100005 }), {
    ok: true,
    value: { name: "キャンディ", description: null, price: 100, stock: 100005 },
  })
  assert.deepEqual(validateProductFields({ ...valid, stock: "100006" }, { stockBase: 100005 }), {
    ok: false,
    errors: { stock: STOCK_MESSAGE },
  })
  assert.deepEqual(validateProductFields({ ...valid, stock: "-1" }, { stockBase: 100005 }), {
    ok: false,
    errors: { stock: STOCK_MESSAGE },
  })
})

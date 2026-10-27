import assert from "node:assert/strict"
import test from "node:test"
import { formatPrice } from "./formatPrice"

test("価格は半角の ¥ とカンマ区切りで表示する", () => {
  assert.equal(formatPrice(1200), "¥1,200")
  assert.equal(formatPrice(1), "¥1")
  assert.equal(formatPrice(9999999), "¥9,999,999")
})

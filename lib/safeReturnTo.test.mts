import assert from "node:assert/strict"
import test from "node:test"
import { safeReturnTo } from "./safeReturnTo"

test("keeps same-site paths", () => {
  assert.equal(safeReturnTo("/s/a/products/b"), "/s/a/products/b")
  assert.equal(safeReturnTo("/cart"), "/cart")
})

test("falls back to / for anything else", () => {
  for (const raw of ["//evil.test", "https://evil.test", "/\\evil.test", "", "cart", "javascript:alert(1)"]) {
    assert.equal(safeReturnTo(raw), "/", raw)
  }
})

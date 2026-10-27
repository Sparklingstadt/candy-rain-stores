import assert from "node:assert/strict"
import test from "node:test"
import { addToCartView } from "./addToCartView"

test("自分のストアの商品は売り切れでもそう案内する", () => {
  assert.equal(addToCartView({ isOwnStore: true, stock: 0, signedIn: true }), "own_store")
  assert.equal(addToCartView({ isOwnStore: true, stock: 3, signedIn: true }), "own_store")
})

test("売り切れはログインしていなくても売り切れと出す", () => {
  assert.equal(addToCartView({ isOwnStore: false, stock: 0, signedIn: false }), "sold_out")
  assert.equal(addToCartView({ isOwnStore: false, stock: 0, signedIn: true }), "sold_out")
})

test("在庫があればログインを促し、ログイン済みならカートに入れられる", () => {
  assert.equal(addToCartView({ isOwnStore: false, stock: 1, signedIn: false }), "sign_in")
  assert.equal(addToCartView({ isOwnStore: false, stock: 1, signedIn: true }), "form")
})

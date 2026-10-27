import assert from "node:assert/strict"
import test from "node:test"
import { toBuyer } from "./buyer"

test("セッションのユーザーから Buyer を作る（画像つき）", () => {
  const user = { id: "s1", name: "あめ子", email: "a@example.com", image: "http://idp/avatars/s1?v=x" }
  assert.deepEqual(toBuyer(user), { sub: "s1", name: "あめ子", email: "a@example.com", image: "http://idp/avatars/s1?v=x" })
})

test("画像がない・空のときは image が null", () => {
  assert.equal(toBuyer({ id: "s1", name: "a", email: "a@b.c" })?.image, null)
  assert.equal(toBuyer({ id: "s1", image: null })?.image, null)
  assert.equal(toBuyer({ id: "s1", image: "" })?.image, null)
})

test("id がなければ null", () => {
  assert.equal(toBuyer(undefined), null)
  assert.equal(toBuyer({ name: "a" }), null)
})

import assert from "node:assert/strict"
import test from "node:test"
import { showChangedNotice } from "./cartNotice"

const fine = { hasProblems: false, version: "v1" }

test("error=changed がなければ出さない", () => {
  assert.equal(showChangedNotice({}, { hasProblems: true, version: "v1" }), false)
  assert.equal(showChangedNotice({ error: "other" }, { hasProblems: true, version: "v1" }), false)
})

test("購入できない商品が残っている間は出す", () => {
  assert.equal(showChangedNotice({ error: "changed" }, { hasProblems: true, version: "v1" }), true)
  assert.equal(showChangedNotice({ error: "changed", v: "old" }, { hasProblems: true, version: "v1" }), true)
})

test("カートが確定しようとしたときのままなら出し、直したら消す", () => {
  assert.equal(showChangedNotice({ error: "changed", v: "v1" }, fine), true)
  assert.equal(showChangedNotice({ error: "changed", v: "v0" }, fine), false)
  assert.equal(showChangedNotice({ error: "changed" }, fine), false)
})

test("検索パラメーターが配列でも落ちない", () => {
  assert.equal(showChangedNotice({ error: ["changed"], v: ["v1"] }, fine), false)
})

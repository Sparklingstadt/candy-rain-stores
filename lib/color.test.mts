import assert from "node:assert/strict"
import test from "node:test"
import { readableTextColor } from "./color"

test("明るい背景には黒、暗い背景には白を返す", () => {
  assert.equal(readableTextColor("#ffffff"), "#000000")
  assert.equal(readableTextColor("#000000"), "#ffffff")
  assert.equal(readableTextColor("#d82887"), "#ffffff")
  assert.equal(readableTextColor("#fde047"), "#000000")
})

test("中くらいの明るさにはコントラストの高い方を返す", () => {
  assert.equal(readableTextColor("#f97316"), "#000000")
  assert.equal(readableTextColor("#22c55e"), "#000000")
  assert.equal(readableTextColor("#2563eb"), "#ffffff")
})

test("3 桁の指定も扱う", () => {
  assert.equal(readableTextColor("#fff"), "#000000")
  assert.equal(readableTextColor("#000"), "#ffffff")
})

test("不正な値は白を返す", () => {
  assert.equal(readableTextColor("red"), "#ffffff")
  assert.equal(readableTextColor(""), "#ffffff")
  assert.equal(readableTextColor("#12345"), "#ffffff")
  assert.equal(readableTextColor("#gggggg"), "#ffffff")
})

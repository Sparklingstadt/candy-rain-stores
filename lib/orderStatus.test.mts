import assert from "node:assert/strict"
import test from "node:test"
import {
  ORDER_STATUSES,
  ORDER_STATUS_LABELS,
  canTransition,
  formatOrderDate,
  nextOwnerStatuses,
  orderNumber,
  PAYMENT_DEADLINE_DAYS,
  paymentDeadline,
  type OrderStatus,
} from "./orderStatus"

test("状態と表示名", () => {
  assert.deepEqual([...ORDER_STATUSES], ["RECEIVED", "PAID", "SHIPPED", "CANCELED"])
  assert.deepEqual(ORDER_STATUS_LABELS, {
    RECEIVED: "受付",
    PAID: "支払確認",
    SHIPPED: "発送済み",
    CANCELED: "キャンセル",
  })
})

test("canTransition", () => {
  const ownerAllowed = ["RECEIVED>PAID", "PAID>SHIPPED", "RECEIVED>CANCELED", "PAID>CANCELED"]
  for (const from of ORDER_STATUSES) {
    for (const to of ORDER_STATUSES) {
      assert.equal(canTransition(from, to), ownerAllowed.includes(`${from}>${to}`), `${from}>${to}`)
    }
  }
})

test("nextOwnerStatuses", () => {
  assert.deepEqual(nextOwnerStatuses("RECEIVED"), ["PAID", "CANCELED"])
  assert.deepEqual(nextOwnerStatuses("PAID"), ["SHIPPED", "CANCELED"])
  assert.deepEqual(nextOwnerStatuses("SHIPPED"), [])
  assert.deepEqual(nextOwnerStatuses("CANCELED"), [])
  for (const from of ORDER_STATUSES) {
    for (const to of nextOwnerStatuses(from as OrderStatus)) assert.equal(canTransition(from, to), true)
  }
})

test("orderNumber", () => {
  assert.equal(orderNumber("a1b2c3d4-0000-4000-8000-000000000000"), "A1B2C3D4")
})

test("formatOrderDate は日本時間", () => {
  assert.equal(formatOrderDate(new Date("2026-10-27T11:15:00Z")), "2026/10/27 20:15")
  assert.equal(formatOrderDate(new Date("2026-01-02T15:05:00Z")), "2026/01/03 00:05")
  assert.equal(formatOrderDate(new Date("2026-03-04T00:00:00Z")), "2026/03/04 09:00")
})

test("paymentDeadline は注文から 7 日後", () => {
  assert.equal(PAYMENT_DEADLINE_DAYS, 7)
  const createdAt = new Date("2026-10-28T03:04:05.678Z")
  assert.equal(paymentDeadline(createdAt).toISOString(), "2026-11-04T03:04:05.678Z")
})

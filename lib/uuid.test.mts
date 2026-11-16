import { describe, it } from "node:test"
import assert from "node:assert/strict"
import { randomUUID } from "node:crypto"
import { isUuid } from "./uuid"

describe("isUuid", () => {
  it("accepts UUIDs case-insensitively and rejects others", () => {
    assert.equal(isUuid(randomUUID()), true)
    assert.equal(isUuid(randomUUID().toUpperCase()), true)
    assert.equal(isUuid("abc"), false)
    assert.equal(isUuid(""), false)
  })
})

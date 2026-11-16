import { describe, it } from "node:test"
import assert from "node:assert/strict"
import { text } from "./formData"

describe("text", () => {
  it("returns a string field as is", () => {
    const form = new FormData()
    form.set("name", " あめ屋 ")
    assert.equal(text(form, "name"), " あめ屋 ")
  })

  it("returns an empty string for a missing field", () => {
    assert.equal(text(new FormData(), "name"), "")
  })

  it("returns an empty string for a file field", () => {
    const form = new FormData()
    form.set("name", new File(["x"], "x.txt"))
    assert.equal(text(form, "name"), "")
  })
})

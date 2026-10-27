import { afterEach, beforeEach, describe, it } from "node:test"
import assert from "node:assert/strict"
import { assertResettableDatabase } from "./assertResettableDatabase"

const remote = "postgresql://u:p@db.example.supabase.co:5432/postgres"
let saved: string | undefined

beforeEach(() => {
  saved = process.env.ALLOW_DB_RESET
  delete process.env.ALLOW_DB_RESET
})
afterEach(() => {
  if (saved === undefined) delete process.env.ALLOW_DB_RESET
  else process.env.ALLOW_DB_RESET = saved
})

describe("assertResettableDatabase", () => {
  it("allows localhost", () => {
    assert.doesNotThrow(() => assertResettableDatabase("postgresql://user@localhost:5432/stores"))
  })
  it("allows 127.0.0.1", () => {
    assert.doesNotThrow(() => assertResettableDatabase("postgresql://user@127.0.0.1:5432/stores"))
  })
  it("allows ::1", () => {
    assert.doesNotThrow(() => assertResettableDatabase("postgresql://user@[::1]:5432/stores"))
  })
  it("rejects a remote host", () => {
    assert.throws(() => assertResettableDatabase(remote), /db\.example\.supabase\.co/)
  })
  it("allows a remote host with ALLOW_DB_RESET=1", () => {
    process.env.ALLOW_DB_RESET = "1"
    assert.doesNotThrow(() => assertResettableDatabase(remote))
  })
  it("rejects undefined", () => {
    assert.throws(() => assertResettableDatabase(undefined), /not set/)
  })
})

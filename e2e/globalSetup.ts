import { Client } from "pg"
import { assertResettableDatabase } from "../tests/assertResettableDatabase"

export default async function globalSetup() {
  const connectionString = process.env.DATABASE_URL ?? "postgresql://user@localhost:5432/stores"
  assertResettableDatabase(connectionString)
  const client = new Client({ connectionString })
  await client.connect()
  try {
    await client.query('TRUNCATE TABLE "Store"')
  } finally {
    await client.end()
  }
}

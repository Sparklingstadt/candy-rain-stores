import { Client } from "pg"

export default async function globalSetup() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL ?? "postgresql://user@localhost:5432/stores",
  })
  await client.connect()
  try {
    await client.query('TRUNCATE TABLE "Store"')
  } finally {
    await client.end()
  }
}

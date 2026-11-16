import { expect, type Page } from "@playwright/test"
import { Client } from "pg"
import { assertResettableDatabase } from "../tests/assertResettableDatabase"

const connectionString = process.env.DATABASE_URL ?? "postgresql://user@localhost:5432/stores"

export async function withDb<T>(fn: (client: Client) => Promise<T>): Promise<T> {
  assertResettableDatabase(connectionString)
  const client = new Client({ connectionString })
  await client.connect()
  try {
    return await fn(client)
  } finally {
    await client.end()
  }
}

// お店はサイトに 1 つだけなので、どのテストもお店のない状態から始める
export async function resetDatabase() {
  await withDb(async (c) => {
    await c.query('TRUNCATE TABLE "Order", "CartItem", "Product", "StoreSettings" CASCADE')
  })
}

export async function login(page: Page, baseURL: string | undefined) {
  // Pages that need an account send signed-out visitors straight to the Candy Rain ID login.
  await page.goto("/dashboard")
  await page.locator('input[name="email"]').fill("user1@mail.com")
  await page.locator('input[name="password"]').fill("demo-password")
  await page.getByRole("button", { name: "サインイン" }).click()
  await expect(page).toHaveURL(`${baseURL}/dashboard`)
}

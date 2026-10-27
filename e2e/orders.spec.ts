import { randomUUID } from "node:crypto"
import { expect, test } from "@playwright/test"
import { Client } from "pg"
import { assertResettableDatabase } from "../tests/assertResettableDatabase"
import { login } from "./helpers"

const connectionString = process.env.DATABASE_URL ?? "postgresql://user@localhost:5432/stores"

async function withDb<T>(fn: (client: Client) => Promise<T>): Promise<T> {
  assertResettableDatabase(connectionString)
  const client = new Client({ connectionString })
  await client.connect()
  try {
    return await fn(client)
  } finally {
    await client.end()
  }
}

// Order/CartItem do not all cascade from Store, so clear them explicitly.
async function cleanup() {
  await withDb(async (c) => {
    await c.query('DELETE FROM "Order"')
    await c.query('DELETE FROM "CartItem"')
    await c.query('TRUNCATE TABLE "Store" CASCADE')
  })
}

async function seedStore(
  c: Client,
  opts: {
    ownerSub: string
    slug: string
    name: string
    paymentInstructions?: string
    contactEmail?: string
    product: string
    price: number
  },
) {
  const storeId = randomUUID()
  const productId = randomUUID()
  await c.query(
    `INSERT INTO "Store" ("id","ownerSub","slug","name","isPublished","paymentInstructions","contactEmail","updatedAt")
     VALUES ($1,$2,$3,$4,true,$5,$6,now())`,
    [storeId, opts.ownerSub, opts.slug, opts.name, opts.paymentInstructions ?? null, opts.contactEmail ?? null],
  )
  await c.query(
    `INSERT INTO "Product" ("id","storeId","name","price","stock","isPublished","updatedAt")
     VALUES ($1,$2,$3,$4,10,true,now())`,
    [productId, storeId, opts.product, opts.price],
  )
  return { storeId, productId }
}

test.beforeEach(cleanup)
test.afterAll(cleanup)

test("2 つのストアで注文し、オーナーとして注文を進める", async ({ page, baseURL }) => {
  const a = await withDb((c) =>
    seedStore(c, {
      ownerSub: "e2e-owner-a",
      slug: "e2e-orders-a",
      name: "E2E ショップA",
      paymentInstructions: "銀行振込でお支払いください（E2E-A）",
      contactEmail: "shop-a@example.com",
      product: "ラムネ",
      price: 300,
    }),
  )
  const b = await withDb((c) =>
    seedStore(c, {
      ownerSub: "e2e-owner-b",
      slug: "e2e-orders-b",
      name: "E2E ショップB",
      paymentInstructions: "代金引換です（E2E-B）",
      product: "グミ",
      price: 500,
    }),
  )

  await login(page, baseURL)

  // two products from two stores into the cart
  for (const [slug, id] of [
    ["e2e-orders-a", a.productId],
    ["e2e-orders-b", b.productId],
  ]) {
    await page.goto(`/s/${slug}/products/${id}`)
    await page.getByRole("button", { name: "カートに入れる" }).click()
    await expect(page.getByText("カートに入れました")).toBeVisible()
  }

  await page.goto("/cart")
  await expect(page.getByRole("heading", { name: "E2E ショップA" })).toBeVisible()
  await expect(page.getByRole("heading", { name: "E2E ショップB" })).toBeVisible()
  await expect(page.getByText("合計 ¥800")).toBeVisible()

  // checkout
  await page.getByRole("link", { name: "注文手続きへ" }).click()
  await expect(page.getByRole("heading", { name: "注文手続き" })).toBeVisible()
  await expect(page.getByText("銀行振込でお支払いください（E2E-A）")).toBeVisible()
  await expect(page.getByText("注文の確定後はキャンセルできません")).toBeVisible()
  await page.getByLabel("郵便番号").fill("100-0001")
  await page.getByLabel("都道府県").selectOption("東京都")
  await page.getByLabel("住所").fill("千代田区千代田1-1")
  await page.getByLabel("電話番号").fill("03-1234-5678")
  await page.getByRole("button", { name: "注文を確定する" }).click()

  // order history: two orders
  await expect(page).toHaveURL(/\/orders\?placed=1/)
  await expect(page.getByText("ご注文を受け付けました")).toBeVisible()
  await expect(page.getByRole("link", { name: /^注文番号 / })).toHaveCount(2)

  // detail of the store A order shows its payment instructions
  await page.getByRole("listitem").filter({ hasText: "E2E ショップA" }).getByRole("link").click()
  await expect(page.getByText("銀行振込でお支払いください（E2E-A）")).toBeVisible()
  await expect(page.getByText("状態：受付")).toBeVisible()

  // buyers cannot cancel their own orders, but can contact the store
  await expect(page.getByRole("button", { name: "注文をキャンセル" })).toHaveCount(0)
  await expect(page.getByRole("link", { name: "shop-a@example.com" })).toHaveAttribute("href", /^mailto:shop-a@example\.com\?subject=/)

  // now user1 becomes an owner: create a store and give it a customer's order
  await page.goto("/dashboard")
  await page.getByLabel("ストア ID").fill("e2e-orders-own")
  await page.getByLabel("ストア名").fill("E2E マイストア")
  await page.getByRole("button", { name: "作成する" }).click()
  await expect(page.getByRole("heading", { name: "ストアを編集" })).toBeVisible()

  const orderId = randomUUID()
  await withDb(async (c) => {
    const { rows } = await c.query('SELECT "id" FROM "Store" WHERE "slug" = $1', ["e2e-orders-own"])
    await c.query(
      `INSERT INTO "Order" ("id","storeId","storeName","buyerSub","buyerName","buyerEmail","postalCode","prefecture","address","phone","status","totalAmount","updatedAt")
       VALUES ($1,$2,'E2E マイストア','e2e-buyer','E2E 太郎','buyer@example.com','150-0001','東京都','渋谷区神宮前1-1','03-0000-0000','RECEIVED',700,now())`,
      [orderId, rows[0].id],
    )
    await c.query(
      `INSERT INTO "OrderItem" ("id","orderId","productName","unitPrice","quantity") VALUES ($1,$2,'マシュマロ',350,2)`,
      [randomUUID(), orderId],
    )
  })

  await page.goto("/dashboard/orders")
  await expect(page.getByText("E2E 太郎")).toBeVisible()
  await page.getByRole("link", { name: /^注文番号 / }).click()
  await expect(page.getByText("状態：受付")).toBeVisible()
  await expect(page.getByText("マシュマロ")).toBeVisible()

  await page.getByRole("button", { name: "支払いを確認した" }).click()
  await expect(page.getByText("状態：支払確認")).toBeVisible()
  await page.getByRole("button", { name: "発送した" }).click()
  await expect(page.getByText("状態：発送済み")).toBeVisible()
})

import { randomUUID } from "node:crypto"
import { expect, test } from "@playwright/test"
import type { Client } from "pg"
import { login, resetDatabase, withDb } from "./helpers"

async function seedStore(
  c: Client,
  opts: { ownerSub: string; name: string; paymentInstructions?: string; contactEmail?: string },
) {
  await c.query(
    `INSERT INTO "StoreSettings" ("id","ownerSub","name","isPublished","paymentInstructions","contactEmail","updatedAt")
     VALUES (1,$1,$2,true,$3,$4,now())`,
    [opts.ownerSub, opts.name, opts.paymentInstructions ?? null, opts.contactEmail ?? null],
  )
}

async function seedProduct(c: Client, name: string, price: number) {
  const id = randomUUID()
  await c.query(
    `INSERT INTO "Product" ("id","name","price","stock","isPublished","updatedAt") VALUES ($1,$2,$3,10,true,now())`,
    [id, name, price],
  )
  return id
}

test.beforeEach(resetDatabase)
test.afterAll(resetDatabase)

test("お店で注文し、オーナーとして注文を進める", async ({ page, baseURL }) => {
  const products = await withDb(async (c) => {
    await seedStore(c, {
      ownerSub: "e2e-owner",
      name: "E2E ショップ",
      paymentInstructions: "銀行振込でお支払いください（E2E）",
      contactEmail: "shop@example.com",
    })
    return [await seedProduct(c, "ラムネ", 300), await seedProduct(c, "グミ", 500)]
  })

  await login(page, baseURL)
  // the store already has an owner, so user1 cannot open another one
  await expect(page.getByRole("heading", { name: "お店はすでにあります" })).toBeVisible()

  // two products into the cart
  for (const id of products) {
    await page.goto(`/products/${id}`)
    await page.getByRole("button", { name: "カートに入れる" }).click()
    await expect(page.getByText("カートに入れました")).toBeVisible()
  }

  await page.goto("/cart")
  await expect(page.getByRole("heading", { name: "E2E ショップ" })).toBeVisible()
  await expect(page.getByText("合計 ¥800")).toBeVisible()

  // checkout
  await page.getByRole("link", { name: "注文手続きへ" }).click()
  await expect(page.getByRole("heading", { name: "注文手続き" })).toBeVisible()
  await expect(page.getByText("銀行振込でお支払いください（E2E）")).toBeVisible()
  await expect(page.getByText("注文の確定後はキャンセルできません")).toBeVisible()
  await page.getByLabel("郵便番号").fill("100-0001")
  await page.getByLabel("都道府県").selectOption("東京都")
  await page.getByLabel("住所").fill("千代田区千代田1-1")
  await page.getByLabel("電話番号").fill("03-1234-5678")
  await page.getByRole("button", { name: "注文を確定する" }).click()

  // order history: one order for both products
  await expect(page).toHaveURL(/\/orders\?placed=1/)
  await expect(page.getByText("ご注文を受け付けました")).toBeVisible()
  await expect(page.getByRole("link", { name: /^注文番号 / })).toHaveCount(1)

  // the order detail shows the payment instructions
  await page.getByRole("link", { name: /^注文番号 / }).click()
  await expect(page.getByText("銀行振込でお支払いください（E2E）")).toBeVisible()
  await expect(page.getByText("状態：受付")).toBeVisible()

  // buyers cannot cancel their own orders, but can contact the store
  await expect(page.getByRole("button", { name: "注文をキャンセル" })).toHaveCount(0)
  await expect(page.getByRole("link", { name: "shop@example.com" })).toHaveAttribute("href", /^mailto:shop@example\.com\?subject=/)

  // now hand the store over to user1 and give it a customer's order
  const orderId = randomUUID()
  await withDb(async (c) => {
    await c.query(`UPDATE "StoreSettings" SET "ownerSub" = (SELECT "buyerSub" FROM "Order" LIMIT 1)`)
    await c.query(
      `INSERT INTO "Order" ("id","storeName","buyerSub","buyerName","buyerEmail","postalCode","prefecture","address","phone","status","totalAmount","updatedAt")
       VALUES ($1,'E2E ショップ','e2e-buyer','E2E 太郎','buyer@example.com','150-0001','東京都','渋谷区神宮前1-1','03-0000-0000','RECEIVED',700,now())`,
      [orderId],
    )
    await c.query(
      `INSERT INTO "OrderItem" ("id","orderId","productName","unitPrice","quantity") VALUES ($1,$2,'マシュマロ',350,2)`,
      [randomUUID(), orderId],
    )
  })

  await page.goto("/dashboard/orders")
  await expect(page.getByText("E2E 太郎")).toBeVisible()
  await page.goto(`/dashboard/orders/${orderId}`)
  await expect(page.getByText("状態：受付")).toBeVisible()
  await expect(page.getByText("マシュマロ")).toBeVisible()

  await page.getByRole("button", { name: "支払いを確認した" }).click()
  await expect(page.getByText("状態：支払確認")).toBeVisible()
  await page.getByRole("button", { name: "発送した" }).click()
  await expect(page.getByText("状態：発送済み")).toBeVisible()
})

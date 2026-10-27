import { expect, test } from "@playwright/test"
import { login } from "./helpers"

const SLUG = "e2e-sweets"
const PRODUCT = "いちごキャンディ"

// minimal buffer with a valid PNG signature; `seed` makes the two files differ
function png(seed: number) {
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    Buffer.alloc(32, seed),
  ])
}

test("商品を作って公開し、削除する", async ({ page, browser, baseURL }) => {
  await login(page, baseURL)

  // store: create and publish
  await page.getByLabel("ストア ID").fill(SLUG)
  await page.getByLabel("ストア名").fill("E2E スイーツ")
  await page.getByRole("button", { name: "作成する" }).click()
  await expect(page.getByRole("heading", { name: "ストアを編集" })).toBeVisible()
  await page.getByRole("button", { name: "公開する" }).click()
  await expect(page.getByText("公開中", { exact: true })).toBeVisible()

  // product: create
  await page.getByRole("link", { name: "商品を管理" }).click()
  await page.getByRole("link", { name: "商品を追加" }).click()
  await page.getByLabel("商品名").fill(PRODUCT)
  await page.getByLabel("価格（円）").fill("1,200")
  await page.getByLabel("在庫数").fill("3")
  await page.getByLabel("説明文").fill("甘酸っぱいいちごの味です")
  await page.getByRole("button", { name: "作成する" }).click()
  await expect(page.getByRole("heading", { name: PRODUCT, level: 1 })).toBeVisible()
  await expect(page).toHaveURL(/\/dashboard\/products\/[0-9a-f-]{36}$/)

  // images: add two, each upload auto-submits
  const images = page.locator('img[alt^="商品画像"]')
  await page.getByLabel("画像を追加").setInputFiles({ name: "a.png", mimeType: "image/png", buffer: png(1) })
  await expect(images).toHaveCount(1)
  await page.getByLabel("画像を追加").setInputFiles({ name: "b.png", mimeType: "image/png", buffer: png(2) })
  await expect(images).toHaveCount(2)

  // make the 2nd image the 1st: src order flips
  const srcs = () => images.evaluateAll((els) => els.map((el) => (el as HTMLImageElement).getAttribute("src")))
  const before = await srcs()
  expect(new Set(before).size).toBe(2)
  await page.getByRole("button", { name: "1 枚目にする" }).click()
  await expect.poll(srcs).toEqual([before[1], before[0]])

  // product: publish
  await page.getByRole("button", { name: "公開する" }).click()
  await expect(page.getByRole("button", { name: "非公開にする" })).toBeVisible()

  // logged-out visitor sees the product in the store and on its detail page
  const visitor = await browser.newContext()
  const visitorPage = await visitor.newPage()
  await visitorPage.goto(`${baseURL}/s/${SLUG}`)
  await expect(visitorPage.getByText(PRODUCT)).toBeVisible()
  await expect(visitorPage.getByText("¥1,200")).toBeVisible()
  await visitorPage.getByRole("link", { name: /いちごキャンディ/ }).click()
  await expect(visitorPage.getByRole("heading", { name: PRODUCT })).toBeVisible()
  await expect(visitorPage.getByText("在庫 3 点")).toBeVisible()
  await expect(visitorPage.getByRole("button", { name: /^画像 \d+ を表示$/ })).toHaveCount(2)
  const detailUrl = visitorPage.url()

  // stock to 0 -> sold out
  await page.getByLabel("在庫数").fill("0")
  await page.getByRole("button", { name: "保存する" }).click()
  await expect(page.getByText("保存しました")).toBeVisible()
  await visitorPage.goto(detailUrl)
  // signed-out visitors see sold out, not a sign-in prompt
  await expect(visitorPage.getByRole("button", { name: "売り切れ" })).toBeDisabled()
  await expect(visitorPage.getByRole("button", { name: "ログインしてカートに入れる" })).toHaveCount(0)

  // delete the product -> detail page is 404
  await page.getByRole("button", { name: "商品を削除" }).click()
  await expect(page.getByRole("alertdialog").getByText("本当に削除しますか？")).toBeVisible()
  await page.getByRole("alertdialog").getByRole("button", { name: "削除する" }).click()
  await expect(page).toHaveURL(`${baseURL}/dashboard/products`)
  const gone = await visitorPage.goto(detailUrl)
  expect(gone?.status()).toBe(404)
  await expect(visitorPage.getByRole("heading", { name: "商品が見つかりません" })).toBeVisible()
  await visitor.close()

  // cleanup: delete the store
  await page.goto("/dashboard")
  await page.getByLabel("確認のためストア ID を入力").fill(SLUG)
  await page.getByRole("button", { name: "削除する" }).click()
  await page.getByRole("alertdialog").getByRole("button", { name: "削除する" }).click()
  await expect(page.getByRole("heading", { name: "ストアを作成" })).toBeVisible()
})

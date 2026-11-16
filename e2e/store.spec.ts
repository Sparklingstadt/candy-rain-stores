import { expect, test } from "@playwright/test"
import { login, resetDatabase } from "./helpers"

const STORE_NAME = "E2E キャンディ"
const DESCRIPTION = "E2E で作ったストアです"

test.beforeEach(resetDatabase)

test("お店を作って公開する", async ({ page, browser, baseURL }) => {
  // before the store exists, the top page invites the owner to sign in
  const visitor = await browser.newContext()
  const visitorPage = await visitor.newPage()
  await visitorPage.goto(`${baseURL}/`)
  await expect(visitorPage.getByRole("button", { name: "Candy Rain ID でログイン" })).toBeVisible()

  // login via Candy Rain ID
  await login(page, baseURL)
  await expect(page.getByRole("heading", { name: "ストアを作成" })).toBeVisible()

  // oversized logo: rejected in the browser without submitting, field cleared
  await page.getByLabel("ロゴ画像").setInputFiles({
    name: "big.png",
    mimeType: "image/png",
    buffer: Buffer.alloc(6 * 1024 * 1024),
  })
  await expect(page.locator("p[role=alert]")).toHaveText("画像は 2MB 以下にしてください")
  await expect(page.getByLabel("ロゴ画像")).toHaveValue("")
  await expect(page.getByRole("heading", { name: "ストアを作成" })).toBeVisible()

  // empty name: error shown, other typed values kept
  await page.getByLabel("説明文").fill(DESCRIPTION)
  await page.getByRole("button", { name: "作成する" }).click()
  await expect(page.getByRole("alert").filter({ hasText: "ストア名は 1〜50 文字で入力してください" })).toBeVisible()
  await expect(page.getByLabel("説明文")).toHaveValue(DESCRIPTION)
  await expect(page.getByRole("heading", { name: "ストアを作成" })).toBeVisible()

  // create
  await page.getByLabel("ストア名").fill(STORE_NAME)
  await page.getByRole("button", { name: "作成する" }).click()
  await expect(page.getByRole("heading", { name: "ストアを編集" })).toBeVisible()
  await expect(page.getByRole("heading", { name: STORE_NAME })).toBeVisible()
  await expect(page.getByRole("main").getByText("非公開", { exact: true })).toBeVisible()
  // the store cannot be deleted any more
  await expect(page.getByRole("button", { name: "削除する" })).toHaveCount(0)

  // unpublished: a logged-out visitor sees that the store is not open yet
  await visitorPage.goto(`${baseURL}/`)
  await expect(visitorPage.getByRole("heading", { name: "ただいま準備中です" })).toBeVisible()
  await expect(visitorPage.getByRole("heading", { name: STORE_NAME })).toHaveCount(0)

  // publish
  await page.getByRole("button", { name: "公開する" }).click()
  await expect(page.getByRole("main").getByText("公開中", { exact: true })).toBeVisible()
  await expect(page.getByRole("button", { name: "非公開にする" })).toBeVisible()

  // the top page is the store; the old URLs lead there
  await visitorPage.goto(`${baseURL}/`)
  await expect(visitorPage.getByRole("heading", { name: STORE_NAME })).toBeVisible()
  await expect(visitorPage.getByText(DESCRIPTION)).toBeVisible()
  for (const old of ["/stores", "/s/old-slug"]) {
    await visitorPage.goto(`${baseURL}${old}`)
    await expect(visitorPage).toHaveURL(`${baseURL}/`)
  }
  await visitorPage.goto(`${baseURL}/orders`)
  await expect(visitorPage.locator('input[name="password"]')).toBeVisible()
  await visitor.close()

  // the owner reaches the edit page from the header of the store page
  await page.goto(`${baseURL}/`)
  await page.getByRole("banner").getByRole("link", { name: "ストアを編集" }).click()
  await expect(page).toHaveURL(`${baseURL}/dashboard`)

  // logout ends the IdP session too
  await page.getByRole("button", { name: "ログアウト" }).click()
  await expect(page).toHaveURL(`${baseURL}/`)
  await page.getByRole("banner").getByRole("button", { name: "ログイン" }).click()
  await expect(page.locator('input[name="password"]')).toBeVisible()
})

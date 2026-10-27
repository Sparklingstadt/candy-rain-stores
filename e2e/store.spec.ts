import { expect, test } from "@playwright/test"
import { login } from "./helpers"

const STORE_NAME = "E2E キャンディ"
const SLUG = "e2e-candy"
const DESCRIPTION = "E2E で作ったストアです"

test("ストアを作って公開し、削除する", async ({ page, browser, baseURL }) => {
  // login via Candy Rain ID
  await login(page, baseURL)

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
  await page.getByLabel("ストア ID").fill(SLUG)
  await page.getByLabel("説明文").fill(DESCRIPTION)
  await page.getByRole("button", { name: "作成する" }).click()
  await expect(page.getByRole("alert").filter({ hasText: "ストア名は 1〜50 文字で入力してください" })).toBeVisible()
  await expect(page.getByLabel("ストア ID")).toHaveValue(SLUG)
  await expect(page.getByLabel("説明文")).toHaveValue(DESCRIPTION)
  await expect(page.getByRole("heading", { name: "ストアを作成" })).toBeVisible()

  // create
  await page.getByLabel("ストア名").fill(STORE_NAME)
  await page.getByRole("button", { name: "作成する" }).click()
  await expect(page.getByRole("heading", { name: "ストアを編集" })).toBeVisible()
  await expect(page.getByRole("heading", { name: STORE_NAME })).toBeVisible()
  await expect(page.getByText("非公開", { exact: true })).toBeVisible()

  // unpublished: 404 for a logged-out visitor
  const visitor = await browser.newContext()
  const visitorPage = await visitor.newPage()
  const unpublished = await visitorPage.goto(`${baseURL}/s/${SLUG}`)
  expect(unpublished?.status()).toBe(404)
  await expect(visitorPage.getByRole("heading", { name: "ストアが見つかりません" })).toBeVisible()

  // publish
  await page.getByRole("button", { name: "公開する" }).click()
  await expect(page.getByText("公開中", { exact: true })).toBeVisible()
  await expect(page.getByRole("button", { name: "非公開にする" })).toBeVisible()

  // visible logged out
  const published = await visitorPage.goto(`${baseURL}/s/${SLUG}`)
  expect(published?.status()).toBe(200)
  await expect(visitorPage.getByRole("heading", { name: STORE_NAME })).toBeVisible()
  await expect(visitorPage.getByText(DESCRIPTION)).toBeVisible()

  // delete
  await page.getByLabel("確認のためストア ID を入力").fill(SLUG)
  await page.getByRole("button", { name: "削除する" }).click()
  await page.getByRole("alertdialog").getByRole("button", { name: "削除する" }).click()
  await expect(page.getByRole("heading", { name: "ストアを作成" })).toBeVisible()

  const deleted = await visitorPage.goto(`${baseURL}/s/${SLUG}`)
  expect(deleted?.status()).toBe(404)
  await visitor.close()

  // logout ends the IdP session too
  await page.getByRole("button", { name: "ログアウト" }).click()
  await expect(page).toHaveURL(`${baseURL}/`)
  await page.getByRole("button", { name: "Candy Rain ID でログイン" }).click()
  await expect(page.locator('input[name="password"]')).toBeVisible()
})

import { expect, type Page } from "@playwright/test"

export async function login(page: Page, baseURL: string | undefined) {
  await page.goto("/")
  await page.getByRole("button", { name: "Candy Rain ID でログイン" }).click()
  await page.locator('input[name="email"]').fill("user1@mail.com")
  await page.locator('input[name="password"]').fill("demo-password")
  await page.getByRole("button", { name: "サインイン" }).click()
  await expect(page).toHaveURL(`${baseURL}/dashboard`)
  await expect(page.getByRole("heading", { name: "ストアを作成" })).toBeVisible()
}

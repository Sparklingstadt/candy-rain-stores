import { expect, type Page } from "@playwright/test"

export async function login(page: Page, baseURL: string | undefined) {
  // Pages that need an account send signed-out visitors straight to the Candy Rain ID login.
  await page.goto("/dashboard")
  await page.locator('input[name="email"]').fill("user1@mail.com")
  await page.locator('input[name="password"]').fill("demo-password")
  await page.getByRole("button", { name: "サインイン" }).click()
  await expect(page).toHaveURL(`${baseURL}/dashboard`)
  await expect(page.getByRole("heading", { name: "ストアを作成" })).toBeVisible()
}

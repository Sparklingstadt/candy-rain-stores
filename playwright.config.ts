import { defineConfig, devices } from "@playwright/test"

const port = 3118
const baseURL = `http://localhost:${port}`

// The Candy Rain ID server must already be running (see README) and must register
// `${baseURL}/api/auth/callback/candy-rain-id` and `${baseURL}/` in its OIDC_CLIENTS.
const env = {
  AUTH_TRUST_HOST: "true",
  AUTH_URL: baseURL,
  IMAGE_STORAGE: "memory",
  AUTH_SECRET: process.env.AUTH_SECRET ?? "e2e-only-secret-not-for-production-use-0123456789",
  AUTH_CANDY_RAIN_ID_ISSUER: process.env.AUTH_CANDY_RAIN_ID_ISSUER ?? "http://localhost:8080",
  AUTH_CANDY_RAIN_ID_ID: process.env.AUTH_CANDY_RAIN_ID_ID ?? "candy-rain-stores",
  AUTH_CANDY_RAIN_ID_SECRET: process.env.AUTH_CANDY_RAIN_ID_SECRET ?? "stores-secret",
  DATABASE_URL: process.env.DATABASE_URL ?? "postgresql://user@localhost:5432/stores",
}
// globalSetup runs in this process and reads the same database URL
process.env.DATABASE_URL = env.DATABASE_URL

export default defineConfig({
  testDir: "./e2e",
  globalSetup: "./e2e/globalSetup.ts",
  workers: 1,
  reporter: "list",
  use: {
    baseURL,
    ...devices["Desktop Chrome"],
    ...(process.env.PLAYWRIGHT_CHROMIUM_PATH
      ? { launchOptions: { executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH } }
      : {}),
  },
  webServer: {
    command: `npm run build && npx next start -p ${port}`,
    url: baseURL,
    env,
    timeout: 240_000,
    reuseExistingServer: false,
  },
})

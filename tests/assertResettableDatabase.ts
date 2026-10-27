const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]", "::1"])

// Test setups delete/truncate every store. Refuse to run against anything but a local
// database unless the developer opts in explicitly with ALLOW_DB_RESET=1.
export function assertResettableDatabase(url: string | undefined): void {
  if (process.env.ALLOW_DB_RESET === "1") return
  if (!url) {
    throw new Error("DATABASE_URL is not set; refusing to reset an unknown database")
  }
  let host: string
  try {
    host = new URL(url).hostname
  } catch {
    throw new Error("DATABASE_URL could not be parsed; refusing to reset an unknown database")
  }
  if (!LOCAL_HOSTS.has(host)) {
    throw new Error(
      `Refusing to reset database on non-local host "${host}". Tests delete all stores; set ALLOW_DB_RESET=1 to override.`,
    )
  }
}

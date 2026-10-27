// Only same-site absolute paths are allowed as a post-login destination.
export function safeReturnTo(raw: string): string {
  if (typeof raw !== "string") return "/"
  if (!raw.startsWith("/") || raw.startsWith("//") || raw.startsWith("/\\")) return "/"
  return raw
}

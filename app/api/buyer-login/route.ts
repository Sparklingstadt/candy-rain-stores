import { candyRainIdProviderId, signIn } from "@/auth"
import { safeReturnTo } from "@/lib/safeReturnTo"

// signIn() sets cookies, which a page render may not do. Pages that need a
// signed-in buyer redirect here; this handler starts the Candy Rain ID login
// and brings the buyer back to returnTo (same-site paths only).
export async function GET(request: Request) {
  const returnTo = new URL(request.url).searchParams.get("returnTo") ?? "/"
  return signIn(candyRainIdProviderId, { redirectTo: safeReturnTo(returnTo) })
}

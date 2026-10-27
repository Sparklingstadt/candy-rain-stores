// After the Auth.js session is cleared, also end the Candy Rain ID session;
// otherwise the next login would succeed without asking for a password.
export function GET(request: Request) {
  const home = new URL("/", request.url)
  const issuer = process.env.AUTH_CANDY_RAIN_ID_ISSUER?.replace(/\/$/, "")
  if (!issuer) return Response.redirect(home, 303)

  const logoutUrl = new URL(`${issuer}/logout`)
  const clientId = process.env.AUTH_CANDY_RAIN_ID_ID
  if (clientId) logoutUrl.searchParams.set("client_id", clientId)
  logoutUrl.searchParams.set("post_logout_redirect_uri", home.toString())
  return Response.redirect(logoutUrl, 303)
}

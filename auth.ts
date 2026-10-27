import NextAuth from "next-auth";

// Candy Rain ID (candy-rain-identity-server) is an OpenID Connect provider.
// It is the only way to sign in to Candy Rain Stores.
export const candyRainIdProviderId = "candy-rain-id"

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [{
    id: candyRainIdProviderId,
    name: "Candy Rain ID",
    type: "oidc",
    issuer: process.env.AUTH_CANDY_RAIN_ID_ISSUER?.replace(/\/$/, ""),
    clientId: process.env.AUTH_CANDY_RAIN_ID_ID,
    clientSecret: process.env.AUTH_CANDY_RAIN_ID_SECRET,
    authorization: { params: { scope: "openid email profile" } },
  }],
})

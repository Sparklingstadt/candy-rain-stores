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
  callbacks: {
    jwt({ token, account }) {
      // token.picture comes from the OIDC `picture` claim (Auth.js maps it to user.image).
      // Auth.js replaces user.id with a random UUID for OIDC sign-ins;
      // the Candy Rain ID subject is kept on the account.
      if (account?.provider === candyRainIdProviderId) token.sub = account.providerAccountId
      return token
    },
    session({ session, token }) {
      if (token.sub && session.user) session.user.id = token.sub
      if (session.user) session.user.image = typeof token.picture === "string" && token.picture ? token.picture : null
      return session
    },
  },
})

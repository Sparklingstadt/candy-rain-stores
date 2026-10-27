import { auth, candyRainIdProviderId, signIn } from "@/auth"

export default async function Page() {
  const session = await auth()

  if (session) {
    return (
      <main>
        <p>ログインに成功しました！</p>
      </main>
    )
  }

  const handleSignIn = async () => {
    "use server"
    await signIn(candyRainIdProviderId, { redirectTo: "/" })
  }

  return (
    <main>
      <h1>Candy Rain Stores</h1>
      <form action={handleSignIn}>
        <button type="submit">Candy Rain ID でログイン</button>
      </form>
    </main>
  )
}

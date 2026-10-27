import { redirect } from "next/navigation"
import { candyRainIdProviderId, signIn } from "@/auth"
import { getSub } from "@/lib/session"

export default async function Page() {
  if (await getSub()) redirect("/dashboard")

  const handleSignIn = async () => {
    "use server"
    await signIn(candyRainIdProviderId, { redirectTo: "/dashboard" })
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

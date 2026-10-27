import { redirect } from "next/navigation"
import { candyRainIdProviderId, signIn } from "@/auth"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { getSub } from "@/lib/session"

export default async function Page() {
  if (await getSub()) redirect("/dashboard")

  const handleSignIn = async () => {
    "use server"
    await signIn(candyRainIdProviderId, { redirectTo: "/dashboard" })
  }

  return (
    <main className="flex min-h-svh items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>
            <h1 className="text-2xl font-bold tracking-tight">Candy Rain Stores</h1>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form action={handleSignIn}>
            <Button type="submit" size="lg" className="w-full">
              Candy Rain ID でログイン
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  )
}

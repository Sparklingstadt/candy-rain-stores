import { createHash, timingSafeEqual } from "node:crypto"
import { revalidatePath } from "next/cache"
import { deps } from "@/app/dashboard/deps"
import { expireUnpaidOrders } from "@/services/orderService"

// Vercel Cron が毎日呼ぶ（vercel.json）。支払期限を過ぎた受付のままの注文をキャンセルして在庫を戻す。
// Vercel は CRON_SECRET を Authorization: Bearer で送る。未設定なら誰にも実行させない
function authorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return false
  const digest = (value: string) => createHash("sha256").update(value).digest()
  return timingSafeEqual(digest(request.headers.get("authorization") ?? ""), digest(`Bearer ${secret}`))
}

export async function GET(request: Request) {
  if (!authorized(request)) return new Response("Unauthorized", { status: 401 })

  const { canceled, storeSlugs } = await expireUnpaidOrders(deps(), new Date())
  for (const slug of storeSlugs) revalidatePath(`/s/${slug}`, "layout")
  return Response.json({ canceled })
}

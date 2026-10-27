export type AddToCartView = "own_store" | "sold_out" | "sign_in" | "form"

// 商品ページの「カートに入れる」欄に何を出すか。
// 自分のストア → 売り切れ → ログインを促す → カートに入れるフォームの順に見る
export function addToCartView(o: { isOwnStore: boolean; stock: number; signedIn: boolean }): AddToCartView {
  if (o.isOwnStore) return "own_store"
  if (o.stock <= 0) return "sold_out"
  if (!o.signedIn) return "sign_in"
  return "form"
}

type Param = string | string[] | undefined

// /cart?error=changed の案内を出すか。購入できない商品が残っている間か、
// カートが確定しようとしたとき（v はそのときの版）のままの間だけ出す。
// 数量を変えたり削除したりして直したあとは、同じ URL のままでも消える
export function showChangedNotice(
  params: { error?: Param; v?: Param },
  cart: { hasProblems: boolean; version: string },
): boolean {
  if (params.error !== "changed") return false
  if (cart.hasProblems) return true
  return typeof params.v === "string" && params.v === cart.version
}

export const MAX_PRODUCTS_PER_STORE = 100
export const MAX_IMAGES_PER_PRODUCT = 5

export type ProductField = "name" | "description" | "price" | "stock"
export type ProductFieldErrors = Partial<Record<ProductField, string>>
export type ProductFields = {
  name: string
  description: string | null
  price: number
  stock: number
}

const NAME_MAX = 80
const DESCRIPTION_MAX = 2000
const PRICE_MIN = 1
const PRICE_MAX = 9_999_999
const STOCK_MAX = 99_999

export function parseHalfWidthInteger(raw: string): number | null {
  const digits = raw.trim().replaceAll(",", "")
  if (!/^[0-9]+$/.test(digits)) return null
  return Number(digits)
}

// stockBase は編集フォームを開いたときの在庫数。変えていない在庫数には上限を当てない
// （キャンセルで在庫が戻り上限を超えても、在庫以外の項目は保存できるようにする）
export function validateProductFields(
  raw: {
    name: string
    description: string
    price: string
    stock: string
  },
  options: { stockBase?: number } = {},
): { ok: true; value: ProductFields } | { ok: false; errors: ProductFieldErrors } {
  const errors: ProductFieldErrors = {}

  const name = raw.name.trim()
  if (name.length < 1 || name.length > NAME_MAX) {
    errors.name = `商品名は 1〜${NAME_MAX} 文字で入力してください`
  }

  const description = raw.description.trim()
  if (description.length > DESCRIPTION_MAX) {
    errors.description = `説明文は ${DESCRIPTION_MAX} 文字以内で入力してください`
  }

  const price = parseHalfWidthInteger(raw.price)
  if (price === null || price < PRICE_MIN || price > PRICE_MAX) {
    errors.price = "価格は 1〜9,999,999 円の半角数字で入力してください"
  }

  const stock = parseHalfWidthInteger(raw.stock)
  if (stock === null || (stock > STOCK_MAX && stock !== options.stockBase)) {
    errors.stock = "在庫数は 0〜99,999 の半角数字で入力してください"
  }

  if (Object.keys(errors).length > 0 || price === null || stock === null) {
    return { ok: false, errors }
  }
  return {
    ok: true,
    value: { name, description: description === "" ? null : description, price, stock },
  }
}

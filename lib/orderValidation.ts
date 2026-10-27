export const MAX_QUANTITY = 10
export const MAX_CART_ITEMS = 30

export const PREFECTURES: readonly string[] = [
  "北海道", "青森県", "岩手県", "宮城県", "秋田県", "山形県", "福島県",
  "茨城県", "栃木県", "群馬県", "埼玉県", "千葉県", "東京都", "神奈川県",
  "新潟県", "富山県", "石川県", "福井県", "山梨県", "長野県", "岐阜県",
  "静岡県", "愛知県", "三重県", "滋賀県", "京都府", "大阪府", "兵庫県",
  "奈良県", "和歌山県", "鳥取県", "島根県", "岡山県", "広島県", "山口県",
  "徳島県", "香川県", "愛媛県", "高知県", "福岡県", "佐賀県", "長崎県",
  "熊本県", "大分県", "宮崎県", "鹿児島県", "沖縄県",
]

export type ShippingField = "postalCode" | "prefecture" | "address" | "phone"
export type ShippingErrors = Partial<Record<ShippingField, string>>
export type ShippingInfo = {
  postalCode: string
  prefecture: string
  address: string
  phone: string
}

const ADDRESS_MAX = 200
const PAYMENT_INSTRUCTIONS_MAX = 1000

export function validateShipping(
  raw: ShippingInfo,
): { ok: true; value: ShippingInfo } | { ok: false; errors: ShippingErrors } {
  const errors: ShippingErrors = {}

  const postalRaw = raw.postalCode.trim()
  const postalCode = /^[0-9]{3}-?[0-9]{4}$/.test(postalRaw)
    ? `${postalRaw.slice(0, 3)}-${postalRaw.slice(-4)}`
    : null
  if (postalCode === null) {
    errors.postalCode = "郵便番号は 7 桁の半角数字で入力してください"
  }

  if (!PREFECTURES.includes(raw.prefecture)) {
    errors.prefecture = "都道府県を選んでください"
  }

  const address = raw.address.trim()
  if (address.length < 1 || address.length > ADDRESS_MAX) {
    errors.address = `住所は 1〜${ADDRESS_MAX} 文字で入力してください`
  }

  const phone = raw.phone.trim()
  const phoneDigits = phone.replaceAll("-", "").length
  if (!/^[0-9-]+$/.test(phone) || phoneDigits < 10 || phoneDigits > 11) {
    errors.phone = "電話番号は 10〜11 桁の半角数字（ハイフン可）で入力してください"
  }

  if (Object.keys(errors).length > 0 || postalCode === null) {
    return { ok: false, errors }
  }
  return {
    ok: true,
    value: { postalCode, prefecture: raw.prefecture, address, phone },
  }
}

export function parseQuantity(raw: string | number): number | null {
  const value = typeof raw === "number" ? raw : /^[0-9]+$/.test(raw.trim()) ? Number(raw.trim()) : NaN
  if (!Number.isInteger(value) || value < 1 || value > MAX_QUANTITY) return null
  return value
}

export function validatePaymentInstructions(
  raw: string,
): { ok: true; value: string | null } | { ok: false; error: string } {
  const value = raw.trim()
  if (value.length > PAYMENT_INSTRUCTIONS_MAX) {
    return {
      ok: false,
      error: `お支払い方法の案内は ${PAYMENT_INSTRUCTIONS_MAX} 文字以内で入力してください`,
    }
  }
  return { ok: true, value: value === "" ? null : value }
}

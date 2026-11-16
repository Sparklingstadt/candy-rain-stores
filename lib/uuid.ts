const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// URL やフォームから来た ID が UUID の形かどうか。DB に問い合わせる前の確認に使う
export function isUuid(value: string): boolean {
  return UUID_PATTERN.test(value)
}

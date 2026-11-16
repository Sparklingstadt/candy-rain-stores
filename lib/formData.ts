// Server Action で、保存処理が例外で失敗したときに出す文言
export const SAVE_FAILED = "保存できませんでした。時間をおいてもう一度お試しください。"

// フォームの文字列の値。項目がない・ファイルが送られてきたときは空文字
export function text(formData: FormData, name: string): string {
  const value = formData.get(name)
  return typeof value === "string" ? value : ""
}

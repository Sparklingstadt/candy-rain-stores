// Picks black or white text for a hex background, by relative luminance (WCAG).
// Anything that is not #rgb / #rrggbb falls back to white.
export function readableTextColor(hex: string): "#000000" | "#ffffff" {
  const match = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(hex)
  if (!match) return "#ffffff"
  let digits = match[1]
  if (digits.length === 3) digits = digits.replace(/./g, (c) => c + c)
  const [r, g, b] = [0, 2, 4].map((i) => {
    const channel = parseInt(digits.slice(i, i + 2), 16) / 255
    return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4
  })
  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b
  return luminance > 0.5 ? "#000000" : "#ffffff"
}

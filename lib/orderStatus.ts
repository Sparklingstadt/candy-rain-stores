export type OrderStatus = "RECEIVED" | "PAID" | "SHIPPED" | "CANCELED"

export const ORDER_STATUSES: readonly OrderStatus[] = ["RECEIVED", "PAID", "SHIPPED", "CANCELED"]

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  RECEIVED: "受付",
  PAID: "支払確認",
  SHIPPED: "発送済み",
  CANCELED: "キャンセル",
}

const OWNER_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  RECEIVED: ["PAID", "CANCELED"],
  PAID: ["SHIPPED", "CANCELED"],
  SHIPPED: [],
  CANCELED: [],
}

const BUYER_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  RECEIVED: ["CANCELED"],
  PAID: [],
  SHIPPED: [],
  CANCELED: [],
}

export function canTransition(actor: "owner" | "buyer", from: OrderStatus, to: OrderStatus): boolean {
  const table = actor === "owner" ? OWNER_TRANSITIONS : BUYER_TRANSITIONS
  return table[from].includes(to)
}

export function nextOwnerStatuses(from: OrderStatus): OrderStatus[] {
  return [...OWNER_TRANSITIONS[from]]
}

export function orderNumber(orderId: string): string {
  return orderId.slice(0, 8).toUpperCase()
}

const dateFormatter = new Intl.DateTimeFormat("ja-JP", {
  timeZone: "Asia/Tokyo",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
})

export function formatOrderDate(date: Date): string {
  const parts: Record<string, string> = {}
  for (const part of dateFormatter.formatToParts(date)) parts[part.type] = part.value
  const hour = parts.hour === "24" ? "00" : parts.hour
  return `${parts.year}/${parts.month}/${parts.day} ${hour}:${parts.minute}`
}

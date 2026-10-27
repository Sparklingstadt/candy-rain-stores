import { Badge } from "@/components/ui/badge"
import { ORDER_STATUS_LABELS, type OrderStatus } from "@/lib/orderStatus"

const VARIANTS: Record<OrderStatus, "default" | "secondary" | "outline" | "destructive"> = {
  RECEIVED: "secondary",
  PAID: "default",
  SHIPPED: "outline",
  CANCELED: "destructive",
}

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  return <Badge variant={VARIANTS[status]}>{ORDER_STATUS_LABELS[status]}</Badge>
}

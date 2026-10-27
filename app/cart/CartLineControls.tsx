"use client"

import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select"
import { MAX_QUANTITY } from "@/lib/orderValidation"
import { removeFromCartAction, setCartQuantityAction } from "./actions"

type Props = { itemId: string; quantity: number; stock: number; name: string }

export function CartLineControls({ itemId, quantity, stock, name }: Props) {
  // 在庫を超えては選べない。在庫が減って今の数が在庫を超えていても、今の数は表示する
  const max = Math.max(Math.min(stock, MAX_QUANTITY), quantity, 1)
  return (
    <div className="flex items-center gap-3">
      <form action={setCartQuantityAction.bind(null, itemId)}>
        <Label>
          <span className="sr-only">{name}の数量</span>
          <NativeSelect
            name="quantity"
            size="sm"
            defaultValue={String(quantity)}
            onChange={(e) => e.currentTarget.form?.requestSubmit()}
          >
            {Array.from({ length: max }, (_, i) => i + 1).map((n) => (
              <NativeSelectOption key={n} value={n}>
                {n}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </Label>
      </form>
      <form action={removeFromCartAction.bind(null, itemId)}>
        <Button type="submit" variant="ghost" size="sm" className="text-destructive hover:text-destructive">
          削除
        </Button>
      </form>
    </div>
  )
}

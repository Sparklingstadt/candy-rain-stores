"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"

type Image = { id: string; url: string }

export function ProductGallery({ name, images }: { name: string; images: Image[] }) {
  const [selected, setSelected] = useState(0)
  if (images.length === 0) {
    return <div className="bg-muted aspect-[4/3] w-full rounded-[18px] border" />
  }
  const current = images[selected] ?? images[0]
  return (
    <div className="flex flex-col gap-3">
      <div className="bg-muted aspect-[4/3] overflow-hidden rounded-[18px] border">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={current.url} alt={name} className="h-full w-full object-cover" />
      </div>
      {images.length > 1 && (
        <div className="grid grid-cols-5 gap-2 sm:gap-3">
          {images.map((image, index) => (
            <button
              key={image.id}
              type="button"
              aria-label={`画像 ${index + 1} を表示`}
              aria-pressed={index === selected}
              onClick={() => setSelected(index)}
              className={cn(
                "focus-visible:ring-ring/50 aspect-square overflow-hidden rounded-xl border-2 p-0 outline-none focus-visible:ring-[3px]",
                index === selected ? "border-(--store-color)" : "border-transparent",
              )}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={image.url} alt="" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

"use client"

import { useState } from "react"

type Image = { id: string; url: string }

export function ProductGallery({ name, images }: { name: string; images: Image[] }) {
  const [selected, setSelected] = useState(0)
  if (images.length === 0) {
    return <div className="aspect-square w-full rounded border-2 border-(--store-color)" />
  }
  const current = images[selected] ?? images[0]
  return (
    <div className="space-y-2">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={current.url} alt={name} className="aspect-square w-full rounded object-cover" />
      {images.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {images.map((image, index) => (
            <button
              key={image.id}
              type="button"
              aria-label={`画像 ${index + 1} を表示`}
              aria-pressed={index === selected}
              onClick={() => setSelected(index)}
              className={`h-16 w-16 overflow-hidden rounded border-2 ${
                index === selected ? "border-(--store-color)" : "border-transparent"
              }`}
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

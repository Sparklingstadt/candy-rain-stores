"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"

// 32px profile picture, or a gray circle when there is none (or it fails to load).
// The picture lives on the Candy Rain ID server, so a plain <img> is used.
export function Avatar({ src, className }: { src: string | null; className?: string }) {
  const [failed, setFailed] = useState<string | null>(null)
  const base = "ring-border block size-8 shrink-0 rounded-full ring-1"
  if (!src || failed === src) {
    return <span aria-hidden className={cn(base, "bg-muted", className)} />
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt=""
      width={32}
      height={32}
      referrerPolicy="no-referrer"
      onError={() => setFailed(src)}
      className={cn(base, "bg-muted object-cover", className)}
    />
  )
}

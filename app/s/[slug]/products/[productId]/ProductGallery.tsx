"use client"

import { useRef, useState } from "react"
import { ChevronLeftIcon, ChevronRightIcon, ImageIcon, Maximize2Icon, XIcon } from "lucide-react"

type Image = { id: string; url: string }

export function ProductGallery({ name, images }: { name: string; images: Image[] }) {
  const [selected, setSelected] = useState(0)
  const dialogRef = useRef<HTMLDialogElement>(null)
  if (images.length === 0) {
    return (
      <div className="flex aspect-square w-full flex-col items-center justify-center gap-4 rounded-[1.75rem] bg-[#eee6df] text-[#79656a]">
        <ImageIcon aria-hidden="true" className="size-12" strokeWidth={1} />
        <p className="text-sm">画像準備中</p>
      </div>
    )
  }
  const currentIndex = Math.min(selected, images.length - 1)
  const current = images[currentIndex]
  return (
    <div className="space-y-4 sm:space-y-5">
      <div className="relative overflow-hidden rounded-[1.5rem] bg-[#eee6df] sm:rounded-[1.75rem]">
        <button type="button" aria-label={`${name}の画像を拡大`} onClick={() => dialogRef.current?.showModal()} className="group block w-full rounded-[1.5rem] outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#a53962]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={current.url} alt={name} width={1024} height={1024} fetchPriority="high" className="aspect-square w-full object-cover" />
          <span className="absolute right-4 bottom-4 flex min-h-11 items-center gap-2 rounded-full bg-[#fffaf6]/95 px-4 text-xs text-[#6e505a] shadow-sm transition-colors group-hover:bg-white">
            <Maximize2Icon aria-hidden="true" className="size-3.5" />拡大する
          </span>
        </button>
        {images.length > 1 && <p className="absolute bottom-5 left-5 rounded-full bg-[#fffaf6]/95 px-3 py-1.5 text-[10px] tracking-wider text-[#6e505a]" aria-live="polite">{currentIndex + 1} / {images.length}</p>}
      </div>
      {images.length > 1 && (
        <div className="flex items-center gap-2 sm:gap-3">
          <button type="button" aria-label="前の画像" onClick={() => setSelected((currentIndex - 1 + images.length) % images.length)} className="flex size-11 shrink-0 items-center justify-center rounded-full border border-[#e8d9d4] text-[#8b6575] transition-colors hover:bg-[#f3dce1]/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#a53962]"><ChevronLeftIcon aria-hidden="true" className="size-4" /></button>
          <div className="flex min-w-0 flex-1 gap-2 overflow-x-auto px-1 py-1 sm:gap-3" aria-label="商品画像一覧">
            {images.map((image, index) => (
              <button key={image.id} type="button" aria-label={`画像 ${index + 1} を表示`} aria-pressed={index === currentIndex} onClick={() => setSelected(index)} className={`size-16 shrink-0 overflow-hidden rounded-xl border-2 p-0.5 outline-none transition-colors focus-visible:ring-2 focus-visible:ring-[#a53962] focus-visible:ring-offset-2 sm:size-20 ${index === currentIndex ? "border-[#a53962]" : "border-transparent hover:border-[#d9bdc7]"}`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={image.url} alt="" width={80} height={80} loading="lazy" className="h-full w-full rounded-lg object-cover" />
              </button>
            ))}
          </div>
          <button type="button" aria-label="次の画像" onClick={() => setSelected((currentIndex + 1) % images.length)} className="flex size-11 shrink-0 items-center justify-center rounded-full border border-[#e8d9d4] text-[#8b6575] transition-colors hover:bg-[#f3dce1]/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#a53962]"><ChevronRightIcon aria-hidden="true" className="size-4" /></button>
        </div>
      )}
      <dialog ref={dialogRef} aria-label={`${name}の拡大画像`} className="fixed inset-0 m-auto max-h-[94dvh] w-[min(94vw,960px)] max-w-none overflow-hidden rounded-2xl border border-[#e8d9d4] bg-[#fffaf6] p-0 text-[#4b3439] shadow-2xl backdrop:bg-[#302129]/65 backdrop:backdrop-blur-sm">
        <div className="flex items-center justify-between gap-4 border-b border-[#eaded9] px-5 py-3"><p className="min-w-0 text-sm leading-6 break-words">{name}</p><button type="button" onClick={() => dialogRef.current?.close()} aria-label="拡大画像を閉じる" className="flex size-11 shrink-0 items-center justify-center rounded-full hover:bg-[#f3dce1]/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#a53962]"><XIcon aria-hidden="true" className="size-5" /></button></div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={current.url} alt={`${name}（拡大）`} width={1024} height={1024} className="max-h-[calc(94dvh-70px)] w-full object-contain" />
      </dialog>
    </div>
  )
}

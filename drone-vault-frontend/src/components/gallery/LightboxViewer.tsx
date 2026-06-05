'use client'
import { useEffect } from 'react'
import { DroneFile } from '@/types'
import { filesApi } from '@/lib/api/files'
import { X, ChevronLeft, ChevronRight } from 'lucide-react'
import { formatBytes } from '@/lib/utils/formatBytes'

interface Props { file: DroneFile; onClose: () => void; onPrev?: () => void; onNext?: () => void }
export function LightboxViewer({ file, onClose, onPrev, onNext }: Props) {
  const imgUrl = (() => {
    const dl = (file as any).downloadUrl as string | undefined
    if (dl) return dl.includes('?') ? `${dl}&inline=true` : `${dl}?inline=true`
    return `${filesApi.getDownloadUrl(file.id)}?inline=true`
  })()

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
      if (event.key === 'ArrowLeft') onPrev?.()
      if (event.key === 'ArrowRight') onNext?.()
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onClose, onPrev, onNext])

  return (
    <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center" role="dialog" aria-modal="true">
      <button type="button" aria-label="Close image preview" onClick={onClose} className="absolute top-4 right-4 text-white/60 hover:text-white p-2 rounded-lg hover:bg-white/10"><X size={24} /></button>
      {onPrev && <button type="button" aria-label="Previous image" onClick={onPrev} className="absolute left-4 text-white/60 hover:text-white p-2 rounded-lg hover:bg-white/10"><ChevronLeft size={32} /></button>}
      {onNext && <button type="button" aria-label="Next image" onClick={onNext} className="absolute right-4 text-white/60 hover:text-white p-2 rounded-lg hover:bg-white/10"><ChevronRight size={32} /></button>}
      <div className="max-w-5xl w-full px-16">
        <img src={imgUrl} alt={file.originalName} decoding="async" className="max-h-[80vh] w-full object-contain rounded-lg" />
        <div className="mt-3 text-center text-slate-400 text-sm">{file.originalName} - {formatBytes(file.size)}</div>
      </div>
    </div>
  )
}

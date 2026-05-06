'use client'
import { DroneFile } from '@/types'
import { X, ChevronLeft, ChevronRight } from 'lucide-react'
import { formatBytes } from '@/lib/utils/formatBytes'

interface Props { file: DroneFile; onClose: () => void; onPrev?: () => void; onNext?: () => void }
export function LightboxViewer({ file, onClose, onPrev, onNext }: Props) {
  const imgUrl = `${process.env.NEXT_PUBLIC_API_URL}/api/files/${file.id}/download`
  return (
    <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center">
      <button onClick={onClose} className="absolute top-4 right-4 text-white/60 hover:text-white p-2 rounded-lg hover:bg-white/10"><X size={24} /></button>
      {onPrev && <button onClick={onPrev} className="absolute left-4 text-white/60 hover:text-white p-2 rounded-lg hover:bg-white/10"><ChevronLeft size={32} /></button>}
      {onNext && <button onClick={onNext} className="absolute right-4 text-white/60 hover:text-white p-2 rounded-lg hover:bg-white/10"><ChevronRight size={32} /></button>}
      <div className="max-w-5xl w-full px-16">
        <img src={imgUrl} alt={file.originalName} className="max-h-[80vh] w-full object-contain rounded-lg" />
        <div className="mt-3 text-center text-slate-400 text-sm">{file.originalName} • {formatBytes(file.size)}</div>
      </div>
    </div>
  )
}

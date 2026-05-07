import { DroneFile } from '@/types'
import { filesApi } from '@/lib/api/files'
import { FileImage } from 'lucide-react'

interface Props { file: DroneFile; onClick?: () => void }
export function ThumbnailCard({ file, onClick }: Props) {
  const thumbUrl = file.thumbnailPath ? filesApi.getThumbnailUrl(file.id) : null
  return (
    <button
      type="button"
      onClick={onClick}
      className="aspect-square w-full bg-slate-800 rounded-lg overflow-hidden cursor-pointer hover:ring-2 hover:ring-cyan-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-600 transition-all group"
      aria-label={`Open ${file.originalName}`}
    >
      {thumbUrl ? (
        <img
          src={thumbUrl}
          alt={file.originalName}
          loading="lazy"
          decoding="async"
          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center"><FileImage size={24} className="text-slate-600" /></div>
      )}
    </button>
  )
}

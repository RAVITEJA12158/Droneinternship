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
      title={file.originalName}
      className="relative aspect-square w-full bg-slate-800 rounded-lg overflow-hidden cursor-pointer hover:ring-2 hover:ring-cyan-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-600 transition-all group"
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
      <div className="pointer-events-none absolute inset-x-0 bottom-0 translate-y-2 bg-gradient-to-t from-slate-950/95 via-slate-950/75 to-transparent px-2.5 pb-2 pt-7 opacity-0 transition-all duration-200 group-hover:translate-y-0 group-hover:opacity-100 group-focus-visible:translate-y-0 group-focus-visible:opacity-100">
        <p className="truncate text-left text-xs font-medium text-white drop-shadow-sm">
          {file.originalName}
        </p>
      </div>
    </button>
  )
}

import { DroneFile } from '@/types'
import { filesApi } from '@/lib/api/files'
import { FileImage } from 'lucide-react'

interface Props { file: DroneFile; onClick?: () => void }
export function ThumbnailCard({ file, onClick }: Props) {
  // BUG-07 fix: thumbnailPath is a filesystem path, not a URL segment.
  // Use the dedicated API helper which builds the correct /api/files/:id/thumbnail URL.
  const thumbUrl = file.thumbnailPath ? filesApi.getThumbnailUrl(file.id) : null
  return (
    <div onClick={onClick} className="aspect-square bg-slate-800 rounded-lg overflow-hidden cursor-pointer hover:ring-2 hover:ring-green-500 transition-all group">
      {thumbUrl ? (
        <img src={thumbUrl} alt={file.originalName} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
      ) : (
        <div className="w-full h-full flex items-center justify-center"><FileImage size={24} className="text-slate-600" /></div>
      )}
    </div>
  )
}

import { DroneFile } from '@/types'
import { filesApi } from '@/lib/api/files'
import { FileImage } from 'lucide-react'

interface Props { file: DroneFile; onClick?: () => void }
export function ThumbnailCard({ file, onClick }: Props) {
  const thumbUrl = file.thumbnailPath ? `${process.env.NEXT_PUBLIC_API_URL}${file.thumbnailPath}` : null
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

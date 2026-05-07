import { Orthomosaic } from '@/types'
import { Badge } from '@/components/ui/Badge'
import { orthomosaicsApi } from '@/lib/api/orthomosaics'
import { Image } from 'lucide-react'
import { formatDate } from '@/lib/utils/formatDate'

const typeVariant: Record<string, 'green' | 'blue' | 'amber' | 'red'> = { RGB: 'green', MULTISPECTRAL: 'blue', NDVI: 'amber', DSM: 'red' }

export function OrthomosaicCard({ ortho }: { ortho: Orthomosaic }) {
  const previewUrl = ortho.previewPath ? `${process.env.NEXT_PUBLIC_API_URL}${ortho.previewPath}` : null
  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
      <div className="aspect-video bg-slate-100 flex items-center justify-center">
        {previewUrl ? <img src={previewUrl} alt={ortho.type} className="w-full h-full object-cover" /> : <Image size={32} className="text-slate-600" />}
      </div>
      <div className="p-4">
        <div className="flex items-center justify-between mb-2">
          <Badge variant={typeVariant[ortho.type] ?? 'slate'}>{ortho.type}</Badge>
          <span className="text-slate-500 text-xs">v{ortho.version}</span>
        </div>
        <p className="text-slate-500 text-xs">{formatDate(ortho.createdAt)}</p>
      </div>
    </div>
  )
}

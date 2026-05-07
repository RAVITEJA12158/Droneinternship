import { Orthomosaic } from '@/types'
import { Badge } from '@/components/ui/Badge'
import { orthomosaicsApi } from '@/lib/api/orthomosaics'
import { Download, Image } from 'lucide-react'
import { formatDate } from '@/lib/utils/formatDate'

const typeVariant: Record<string, 'green' | 'blue' | 'amber' | 'red'> = { RGB: 'green', MULTISPECTRAL: 'blue', NDVI: 'amber', DSM: 'red' }

export function OrthomosaicCard({ ortho }: { ortho: Orthomosaic }) {
  const previewUrl = ortho.previewPath ? orthomosaicsApi.getPreviewUrl(ortho.id) : null
  const downloadUrl = orthomosaicsApi.getDownloadUrl(ortho.id)
  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
      <div className="aspect-video bg-slate-100 flex items-center justify-center">
        {previewUrl ? (
          <img
            src={previewUrl}
            alt={ortho.type}
            loading="lazy"
            decoding="async"
            className="w-full h-full object-cover"
          />
        ) : (
          <Image size={32} className="text-slate-600" />
        )}
      </div>
      <div className="p-4">
        <div className="flex items-center justify-between mb-2">
          <Badge variant={typeVariant[ortho.type] ?? 'slate'}>{ortho.type}</Badge>
          <span className="text-slate-500 text-xs">v{ortho.version}</span>
        </div>
        <div className="flex items-center justify-between gap-3">
          <p className="text-slate-500 text-xs">{formatDate(ortho.createdAt)}</p>
          <a
            href={downloadUrl}
            className="inline-flex h-8 items-center gap-1.5 rounded-md border border-slate-200 px-2.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
          >
            <Download size={13} />
            TIFF
          </a>
        </div>
      </div>
    </div>
  )
}

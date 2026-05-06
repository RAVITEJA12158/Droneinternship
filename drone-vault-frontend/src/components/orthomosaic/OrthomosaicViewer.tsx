import { Orthomosaic } from '@/types'
import { OrthomosaicCard } from './OrthomosaicCard'
import { EmptyState } from '@/components/ui/EmptyState'
import { Layers } from 'lucide-react'

export function OrthomosaicViewer({ orthomosaics }: { orthomosaics: Orthomosaic[] }) {
  if (!orthomosaics.length) return <EmptyState icon={Layers} title="No orthomosaics" description="Upload orthomosaics in the upload flow" />
  return <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">{orthomosaics.map(o => <OrthomosaicCard key={o.id} ortho={o} />)}</div>
}

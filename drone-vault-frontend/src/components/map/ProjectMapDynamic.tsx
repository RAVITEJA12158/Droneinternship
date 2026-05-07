// This wrapper loads ProjectMap with ssr: false so Leaflet (which requires
// window/document) is never imported during server-side rendering.
// Import THIS file in pages/components — never import ProjectMap directly.
import dynamic from 'next/dynamic'
import { Spinner } from '@/components/ui/Spinner'

export const ProjectMapDynamic = dynamic(
  () => import('./ProjectMap').then(m => m.ProjectMap),
  {
    ssr: false,
    loading: () => (
      <div className="h-64 bg-slate-800 rounded-xl flex items-center justify-center">
        <Spinner size="md" />
      </div>
    ),
  }
)

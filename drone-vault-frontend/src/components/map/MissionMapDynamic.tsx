// This wrapper loads MissionMap with ssr: false so Leaflet (which requires
// window/document) is never imported during server-side rendering.
// Import THIS file in pages/components — never import MissionMap directly.
import dynamic from 'next/dynamic'
import { Spinner } from '@/components/ui/Spinner'

export const MissionMapDynamic = dynamic(
  () => import('./MissionMap').then(m => m.MissionMap),
  {
    ssr: false,
    loading: () => (
      <div className="h-96 bg-slate-800 rounded-xl flex items-center justify-center">
        <Spinner size="md" />
      </div>
    ),
  }
)

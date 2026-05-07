import dynamic from 'next/dynamic'
import { Spinner } from '@/components/ui/Spinner'

export const MissionMapDynamic = dynamic(
  () => import('./MissionMap').then(m => m.MissionMap),
  {
    ssr: false,
    loading: () => (
      <div className="h-96 bg-white border border-slate-200 rounded-xl flex items-center justify-center shadow-sm">
        <Spinner size="md" />
      </div>
    ),
  }
)

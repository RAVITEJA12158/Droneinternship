import dynamic from 'next/dynamic'
import { Spinner } from '@/components/ui/Spinner'

export const ProjectMapDynamic = dynamic(
  () => import('./ProjectMap').then(m => m.ProjectMap),
  {
    ssr: false,
    loading: () => (
      <div className="h-80 bg-white border border-slate-200 rounded-xl flex items-center justify-center shadow-sm">
        <Spinner size="md" />
      </div>
    ),
  }
)

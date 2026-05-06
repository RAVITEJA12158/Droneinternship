import { Mission } from '@/types'
import { MissionCard } from './MissionCard'
import { EmptyState } from '@/components/ui/EmptyState'
import { Target } from 'lucide-react'

export function MissionList({ missions, projectId }: { missions: Mission[]; projectId: string }) {
  if (!missions.length) return <EmptyState icon={Target} title="No missions yet" description="Add a mission to start uploading drone data" />
  return <div className="space-y-3">{missions.map(m => <MissionCard key={m.id} mission={m} projectId={projectId} />)}</div>
}

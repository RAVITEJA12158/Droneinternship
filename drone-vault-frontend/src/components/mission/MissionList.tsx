import { Mission } from '@/types'
import { MissionCard } from './MissionCard'
import { EmptyState } from '@/components/ui/EmptyState'
import { Button } from '@/components/ui/Button'
import { Plus, Target } from 'lucide-react'
import Link from 'next/link'

export function MissionList({ missions, projectId }: { missions: Mission[]; projectId: string }) {
  if (!missions.length) {
    return (
      <EmptyState
        icon={Target}
        title="No missions yet"
        description="Add a mission to start uploading drone data"
        action={
          <Link href={`/projects/${projectId}/missions/new`}>
            <Button><Plus size={16} />New Mission</Button>
          </Link>
        }
      />
    )
  }

  return <div className="space-y-3">{missions.map(m => <MissionCard key={m.id} mission={m} projectId={projectId} />)}</div>
}

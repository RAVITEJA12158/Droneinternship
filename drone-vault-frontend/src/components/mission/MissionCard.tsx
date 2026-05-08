import { Mission } from '@/types'
import Link from 'next/link'
import { Calendar, ExternalLink, FileImage, HardDrive } from 'lucide-react'
import { formatDate } from '@/lib/utils/formatDate'
import { formatBytes } from '@/lib/utils/formatBytes'
import { Button } from '@/components/ui/Button'
import { DeleteMissionButton } from './DeleteMissionButton'

interface Props { mission: Mission; projectId: string }
export function MissionCard({ mission, projectId }: Props) {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm shadow-slate-950/5 transition-all hover:border-cyan-300 hover:shadow-md hover:shadow-slate-950/10">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <Link href={`/projects/${projectId}/missions/${mission.id}`} className="block min-w-0 flex-1">
          <h3 className="text-slate-950 font-semibold mb-1">{mission.name}</h3>
          {mission.notes && <p className="text-slate-600 text-sm mb-3 line-clamp-2">{mission.notes}</p>}
          <div className="flex flex-wrap gap-3 text-xs text-slate-500">
            <span className="flex items-center gap-1"><Calendar size={12} />{formatDate(mission.captureDate)}</span>
            {mission.fileCount != null && <span className="flex items-center gap-1"><FileImage size={12} />{mission.fileCount} files</span>}
            {mission.storageUsed != null && <span className="flex items-center gap-1"><HardDrive size={12} />{formatBytes(mission.storageUsed)}</span>}
          </div>
        </Link>
        <div className="flex shrink-0 gap-2">
          <Link href={`/projects/${projectId}/missions/${mission.id}`}>
            <Button type="button" size="sm" variant="secondary">
              <ExternalLink size={14} />
              Open
            </Button>
          </Link>
          <DeleteMissionButton
            projectId={projectId}
            missionId={mission.id}
            missionName={mission.name}
          />
        </div>
      </div>
    </div>
  )
}

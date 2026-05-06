import { Mission } from '@/types'
import Link from 'next/link'
import { Calendar, FileImage, HardDrive } from 'lucide-react'
import { formatDate } from '@/lib/utils/formatDate'
import { formatBytes } from '@/lib/utils/formatBytes'

interface Props { mission: Mission; projectId: string }
export function MissionCard({ mission, projectId }: Props) {
  return (
    <Link href={`/projects/${projectId}/missions/${mission.id}`} className="block bg-slate-900 border border-slate-800 rounded-xl p-5 hover:border-green-600/50 transition-all">
      <h3 className="text-white font-semibold mb-1">{mission.name}</h3>
      {mission.notes && <p className="text-slate-400 text-sm mb-3 line-clamp-2">{mission.notes}</p>}
      <div className="flex flex-wrap gap-3 text-xs text-slate-500">
        <span className="flex items-center gap-1"><Calendar size={12} />{formatDate(mission.captureDate)}</span>
        {mission.fileCount != null && <span className="flex items-center gap-1"><FileImage size={12} />{mission.fileCount} files</span>}
        {mission.storageUsed != null && <span className="flex items-center gap-1"><HardDrive size={12} />{formatBytes(mission.storageUsed)}</span>}
      </div>
    </Link>
  )
}

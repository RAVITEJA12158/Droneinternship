import { Project } from '@/types'
import Link from 'next/link'
import { MapPin, Target, Calendar } from 'lucide-react'
import { formatDate } from '@/lib/utils/formatDate'

export function ProjectCard({ project }: { project: Project }) {
  return (
    <Link href={`/projects/${project.id}`} className="block bg-slate-900 border border-slate-800 rounded-xl p-5 hover:border-green-600/50 transition-all hover:shadow-lg hover:shadow-green-900/20">
      <div className="flex items-start justify-between mb-3">
        <h3 className="text-white font-semibold text-lg leading-tight">{project.name}</h3>
        {project.missionCount !== undefined && (
          <span className="bg-green-500/20 text-green-400 text-xs font-medium px-2 py-0.5 rounded-full border border-green-500/30 ml-2 shrink-0">
            {project.missionCount} missions
          </span>
        )}
      </div>
      {project.description && <p className="text-slate-400 text-sm mb-4 line-clamp-2">{project.description}</p>}
      <div className="flex flex-wrap gap-3 text-xs text-slate-500">
        {project.latitude != null && project.longitude != null && (
          <span className="flex items-center gap-1"><MapPin size={12} />{project.latitude.toFixed(4)}, {project.longitude.toFixed(4)}</span>
        )}
        <span className="flex items-center gap-1"><Calendar size={12} />{formatDate(project.createdAt)}</span>
      </div>
    </Link>
  )
}

import { Project } from '@/types'
import Link from 'next/link'
import { MapPin, Target, Calendar } from 'lucide-react'
import { formatDate } from '@/lib/utils/formatDate'

export function ProjectCard({ project }: { project: Project }) {
  return (
    <Link href={`/projects/${project.id}`} className="block bg-white border border-slate-200 rounded-xl p-5 shadow-sm hover:border-cyan-300 hover:shadow-md transition-all">
      <div className="flex items-start justify-between mb-3">
        <h3 className="text-slate-950 font-semibold text-lg leading-tight">{project.name}</h3>
        {project.missionCount !== undefined && (
          <span className="bg-cyan-50 text-cyan-800 text-xs font-medium px-2 py-0.5 rounded-full border border-cyan-200 ml-2 shrink-0">
            {project.missionCount} missions
          </span>
        )}
      </div>
      {project.description && <p className="text-slate-600 text-sm mb-4 line-clamp-2">{project.description}</p>}
      <div className="flex flex-wrap gap-3 text-xs text-slate-500">
        {project.latitude != null && project.longitude != null && (
          <span className="flex items-center gap-1"><MapPin size={12} />{project.latitude.toFixed(4)}, {project.longitude.toFixed(4)}</span>
        )}
        <span className="flex items-center gap-1"><Calendar size={12} />{formatDate(project.createdAt)}</span>
      </div>
    </Link>
  )
}

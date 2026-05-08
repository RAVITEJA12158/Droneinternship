import { Project } from '@/types'
import Link from 'next/link'
import { MapPin, Calendar, ExternalLink } from 'lucide-react'
import { formatDate } from '@/lib/utils/formatDate'
import { Button } from '@/components/ui/Button'
import { DeleteProjectButton } from './DeleteProjectButton'

export function ProjectCard({ project, showActions = false }: { project: Project; showActions?: boolean }) {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm shadow-slate-950/5 transition-all hover:border-cyan-300 hover:shadow-md hover:shadow-slate-950/10">
      <div className="flex flex-col gap-4">
        <Link href={`/projects/${project.id}`} className="block">
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
        {showActions && (
          <div className="flex gap-2">
            <Link href={`/projects/${project.id}`}>
              <Button type="button" size="sm" variant="secondary">
                <ExternalLink size={14} />
                Open
              </Button>
            </Link>
            <DeleteProjectButton projectId={project.id} projectName={project.name} />
          </div>
        )}
      </div>
    </div>
  )
}

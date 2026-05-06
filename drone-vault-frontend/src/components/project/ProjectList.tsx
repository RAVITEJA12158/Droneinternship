import { Project } from '@/types'
import { ProjectCard } from './ProjectCard'
import { EmptyState } from '@/components/ui/EmptyState'
import { FolderOpen } from 'lucide-react'

export function ProjectList({ projects }: { projects: Project[] }) {
  if (!projects.length) return <EmptyState icon={FolderOpen} title="No projects yet" description="Create your first project to get started" />
  return <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">{projects.map(p => <ProjectCard key={p.id} project={p} />)}</div>
}

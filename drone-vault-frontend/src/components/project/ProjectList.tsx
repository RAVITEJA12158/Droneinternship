import { Project } from '@/types'
import { ProjectCard } from './ProjectCard'
import { EmptyState } from '@/components/ui/EmptyState'
import { Button } from '@/components/ui/Button'
import { FolderOpen, Plus } from 'lucide-react'
import Link from 'next/link'

export function ProjectList({ projects }: { projects: Project[] }) {
  if (!projects.length) {
    return (
      <EmptyState
        icon={FolderOpen}
        title="No projects yet"
        description="Create your first project to get started"
        action={
          <Link href="/projects/new">
            <Button><Plus size={16} />New Project</Button>
          </Link>
        }
      />
    )
  }

  return <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">{projects.map(p => <ProjectCard key={p.id} project={p} />)}</div>
}

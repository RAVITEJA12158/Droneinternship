'use client'
import { useState } from 'react'
import { useProjects } from '@/hooks/useProjects'
import { ProjectList } from '@/components/project/ProjectList'
import { PageShell } from '@/components/layout/PageShell'
import { Button } from '@/components/ui/Button'
import { SearchFilters } from '@/components/search/SearchFilters'
import { Spinner } from '@/components/ui/Spinner'
import { ErrorState } from '@/components/ui/ErrorState'
import Link from 'next/link'
import { Plus } from 'lucide-react'

export default function ProjectsPage() {
  const { data: response, isLoading, isError } = useProjects()
  const [search, setSearch] = useState('')

  const projects = response?.data ?? []
  const filtered = projects.filter(p => p.name.toLowerCase().includes(search.toLowerCase()))

  return (
    <PageShell
      title="Projects"
      subtitle={`${response?.total ?? 0} projects`}
      actions={
        <Link href="/projects/new">
          <Button><Plus size={16} />New Project</Button>
        </Link>
      }
    >
      <SearchFilters value={search} onChange={setSearch} placeholder="Search projects…" />
      {isLoading ? <div className="flex justify-center py-16"><Spinner size="lg" /></div>
        : isError ? <ErrorState />
        : <ProjectList projects={filtered} />}
    </PageShell>
  )
}

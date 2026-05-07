'use client'
import { PageShell } from '@/components/layout/PageShell'
import { ProjectForm } from '@/components/project/ProjectForm'
import { useCreateProject } from '@/hooks/useProjects'

export default function NewProjectPage() {
  const { mutate, isPending } = useCreateProject()
  return (
    <PageShell title="New Project" subtitle="Create a new drone project" backHref="/projects" backLabel="Projects">
      <div className="max-w-xl bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
        <ProjectForm onSubmit={mutate} loading={isPending} />
      </div>
    </PageShell>
  )
}

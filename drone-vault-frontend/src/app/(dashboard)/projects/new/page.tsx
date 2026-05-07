'use client'
import { PageShell } from '@/components/layout/PageShell'
import { ProjectForm } from '@/components/project/ProjectForm'
import { useCreateProject } from '@/hooks/useProjects'

export default function NewProjectPage() {
  const { mutate, isPending } = useCreateProject()
  return (
    <PageShell title="New Project" subtitle="Create a new drone project" backHref="/projects" backLabel="Projects">
      <div className="max-w-xl bg-slate-900 border border-slate-800 rounded-2xl p-6">
        <ProjectForm onSubmit={mutate} loading={isPending} />
      </div>
    </PageShell>
  )
}

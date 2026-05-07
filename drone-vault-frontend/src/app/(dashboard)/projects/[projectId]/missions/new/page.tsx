'use client'
import { useParams } from 'next/navigation'
import { PageShell } from '@/components/layout/PageShell'
import { MissionForm } from '@/components/mission/MissionForm'
import { useCreateMission } from '@/hooks/useMissions'

export default function NewMissionPage() {
  const { projectId } = useParams<{ projectId: string }>()
  const { mutate, isPending } = useCreateMission(projectId)
  return (
    <PageShell
      title="New Mission"
      subtitle="Add a flight mission to this project"
      backHref={`/projects/${projectId}`}
      backLabel="Project"
    >
      <div className="max-w-xl bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
        <MissionForm onSubmit={mutate} loading={isPending} />
      </div>
    </PageShell>
  )
}

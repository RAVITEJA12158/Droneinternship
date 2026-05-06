'use client'
import { useParams } from 'next/navigation'
import { PageShell } from '@/components/layout/PageShell'
import { MissionForm } from '@/components/mission/MissionForm'
import { useCreateMission } from '@/hooks/useMissions'

export default function NewMissionPage() {
  const { projectId } = useParams<{ projectId: string }>()
  const { mutate, isPending } = useCreateMission(projectId)
  return (
    <PageShell title="New Mission" subtitle="Add a flight mission to this project">
      <div className="max-w-xl bg-slate-900 border border-slate-800 rounded-2xl p-6">
        <MissionForm onSubmit={mutate} loading={isPending} />
      </div>
    </PageShell>
  )
}

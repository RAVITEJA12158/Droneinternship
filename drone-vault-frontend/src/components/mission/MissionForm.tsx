'use client'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { missionSchema, MissionFormValues } from '@/lib/validations/mission.schema'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'

interface Props { onSubmit: (values: MissionFormValues) => void; loading?: boolean }
export function MissionForm({ onSubmit, loading }: Props) {
  const { register, handleSubmit, formState: { errors } } = useForm<MissionFormValues>({ resolver: zodResolver(missionSchema) })
  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <Input label="Mission Name *" {...register('name')} error={errors.name?.message} placeholder="Field Survey 01" />
      <Input label="Capture Date *" type="date" {...register('captureDate')} error={errors.captureDate?.message} />
      <div className="space-y-1">
        <label className="block text-sm font-medium text-slate-300">Notes</label>
        <textarea {...register('notes')} rows={3} className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-green-500 resize-none" placeholder="Optional notes…" />
      </div>
      <Button type="submit" loading={loading} className="w-full">Create Mission</Button>
    </form>
  )
}

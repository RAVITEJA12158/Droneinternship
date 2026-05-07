'use client'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { projectSchema, ProjectFormValues } from '@/lib/validations/project.schema'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'

interface Props { onSubmit: (values: ProjectFormValues) => void; loading?: boolean; defaultValues?: Partial<ProjectFormValues> }

export function ProjectForm({ onSubmit, loading, defaultValues }: Props) {
  const { register, handleSubmit, formState: { errors } } = useForm<ProjectFormValues>({ resolver: zodResolver(projectSchema), defaultValues })
  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <Input label="Project Name *" {...register('name')} error={errors.name?.message} placeholder="My Drone Survey" />
      <div className="space-y-1.5">
        <label className="block text-sm font-medium text-slate-700">Description</label>
        <textarea {...register('description')} rows={3} className="w-full bg-white border border-slate-200 rounded-lg px-3.5 py-2 text-slate-950 placeholder-slate-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-cyan-600 focus:border-cyan-600 resize-none" placeholder="Optional description..." />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input label="Latitude" type="number" step="any" {...register('latitude', { valueAsNumber: true })} error={errors.latitude?.message} placeholder="e.g. -33.8688" />
        <Input label="Longitude" type="number" step="any" {...register('longitude', { valueAsNumber: true })} error={errors.longitude?.message} placeholder="e.g. 151.2093" />
      </div>
      <Button type="submit" loading={loading} className="w-full">Save Project</Button>
    </form>
  )
}

'use client'

import { MouseEvent } from 'react'
import { Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { useDeleteProject } from '@/hooks/useProjects'

interface Props {
  projectId: string
  projectName: string
  size?: 'sm' | 'md' | 'lg'
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost'
  className?: string
  preventNavigation?: boolean
}

export function DeleteProjectButton({
  projectId,
  projectName,
  size = 'sm',
  variant = 'danger',
  className,
  preventNavigation = false,
}: Props) {
  const deleteProject = useDeleteProject()

  const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
    if (preventNavigation) {
      event.preventDefault()
      event.stopPropagation()
    }

    const confirmed = window.confirm(
      `Delete project "${projectName}"? This will permanently remove all missions, uploads, capture sets, and orthomosaics inside it.`
    )

    if (!confirmed) {
      return
    }

    deleteProject.mutate(projectId)
  }

  return (
    <Button
      type="button"
      size={size}
      variant={variant}
      className={className}
      loading={deleteProject.isPending}
      onClick={handleClick}
    >
      <Trash2 size={14} />
      Delete
    </Button>
  )
}
